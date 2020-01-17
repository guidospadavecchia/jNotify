﻿let jnotifyCollection = [];

//Compatibilidad con IE
if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
        value: function (predicate) {

            if (this == null) {
                throw new TypeError('"this" is null or not defined');
            }

            var o = Object(this);
            var len = o.length >>> 0;

            if (typeof predicate !== 'function') {
                throw new TypeError('predicate must be a function');
            }

            var thisArg = arguments[1];

            var k = 0;

            while (k < len) {
                var kValue = o[k];
                if (predicate.call(thisArg, kValue, k, o)) {
                    return kValue;
                }
                k++;
            }

            return undefined;
        }
    });
}

/**
 * Clase para el envío de notificaciones push.
 * */
(function ($) {

    jNotify = window.jNotify || {};

    const DIV_NOTIFY = '<div class="jnotify"><div class="message-container"><div class="icon"></div><div class="message">{0}</div></div></div>';
    const DIV_NOTIFY_DESCRIPTION = '<div class="jnotify"><div class="message-container"><div class="icon"></div><div class="message">{0}</div></div><div class="description">{1}</div></div>';
    const DIV_NOTIFY_CLOSE_BUTTON = '<div class="close"></div>';
    const INITIAL_OFFSET = 45;
    const NOTIFICATION_SEPARATION = 5;
    const DEFAULT_MESSAGE = '';
    const DEFAULT_DESCRIPTION = '';
    const DEFAULT_DELAY = 2500;
    const DEFAULT_FADEDELAY = 1000;
    const DEFAULT_SHOW_CLOSE_BUTTON = false;
    const DEFAULT_TITLE_BOLD = true;

    let _notificationTypes = {
        success: 'success',
        warning: 'warning',
        info: 'info',
        error: 'error',
        default: 'default'
    }

    let _notificationColors = {
        success: { text: 'white', background: '#28A745', backgroundTitle: '#1A6B2C' },
        warning: { text: '#504110', background: '#FFC107', backgroundTitle: '#E6AC00' },
        info: { text: 'white', background: '#007BFF', backgroundTitle: '#004DA1' },
        error: { text: 'white', background: '#DC3545', backgroundTitle: '#852029' },
        default: { text: 'white', background: '#343A40', backgroundTitle: '#1F2326' }
    }

    /**
     * Concatena cadenas con varios parámetros. El primer parámetro es una cadena de string. Los demás parámetros son variables de cualquier tipo.
     * */
    _formatString = function () {
        let cadena = arguments[0];
        for (let i = 0; i < arguments.length - 1; i++) {
            let reg = new RegExp("\\{" + i + "\\}", "g");
            cadena = cadena.replace(reg, arguments[i + 1]);
        }

        return cadena;
    }

    _getElementHeight = function (element) {
        return element.outerHeight() + NOTIFICATION_SEPARATION;
    }

    _calculateTotalOffset = function (offset) {
        let totalHeight = offset;
        $(".jnotify").each(function () {
            totalHeight += _getElementHeight($(this));
            //To invert the order of the notification (first below), change this for:            
            // totalHeight -= _getElementHeight($(this));            
        });
        return totalHeight;
    }

    _setCSS = function (div, textColor, backgroundColor, backgroundTitleColor, iconClassName) {
        div.css({ color: textColor, background: backgroundColor });
        if (div.find('.message-container').length == 1) {
            div.find('.message-container').css({ color: textColor, background: backgroundTitleColor });
        }
        if (div.find(".icon").length == 1) {
            div.find(".icon").addClass(iconClassName);
        }
    }

    _onClose = function (divNotify) {
        let closingElement = jnotifyCollection.find(function (item) {
            return item.element == divNotify;
        });

        if (typeof closingElement != 'undefined' && closingElement != null) {
            let divId = closingElement.id;
            let divHeight = _getElementHeight(divNotify);
            jnotifyCollection = jQuery.grep(jnotifyCollection, function (item) {
                return item.element != divNotify;
            });

            divNotify.remove();

            let elementsToMove = jQuery.grep(jnotifyCollection, function (item) {
                return item.id > divId;
            });

            $.each(elementsToMove, function (i, item) {
                let originalBottom = parseInt(item.element.css('bottom'), 10);
                let destinationBottom = _formatString('-={0}px', divHeight);

                item.element.animate({ bottom: destinationBottom }, 300, function () {
                    $(this).css({ bottom: originalBottom - divHeight });
                });
            });
        }
    }

    _sortById = function (a, b) {
        return ((a.id < b.id) ? -1 : ((a.id > b.id) ? 1 : 0));
    }

    _mergeOptions = function (message, description, defaults, userOptions) {
        let mergedOptions = {};
        $.extend(mergedOptions, defaults, userOptions);
        if (typeof userOptions == 'undefined' || typeof userOptions.type == 'undefined' || userOptions.type == null || userOptions.type == '') {
            mergedOptions.type = _notificationTypes.default;
        }
        if (typeof message != 'undefined' && message != null && message != '') {
            mergedOptions.message = message;
        }
        if (typeof description != 'undefined' && description != null && description != '') {
            mergedOptions.description = description;
        }
        return mergedOptions;
    }

    var notifyOptions = {
        /**
         * Titulo de la notificación.
         * */
        message: DEFAULT_MESSAGE,
        /**
         * Mensaje de la notificación.
         * */
        description: DEFAULT_DESCRIPTION,
        /**
         * Indica cuanto durará la notificación antes de desaparecer.
         * */
        delay: DEFAULT_DELAY,
        /**
         * Indica cuanto durará la transición al aparecer y desaparecer la notificación.
         * */
        fadeDelay: DEFAULT_FADEDELAY,
        /**
         * Tipo de notificación (cambia el color de fondo e icono).
         * */
        type: _notificationTypes.default,
        /**
         * Indica si se debe mostrar el botón para cerrar la notificación.
         * */
        closeButton: DEFAULT_SHOW_CLOSE_BUTTON,
        /**
        * Indica si el título se tiene que mostrar en negrita.
        * */
        titleBold: DEFAULT_TITLE_BOLD,
        /**
         * Indica el desplazamiento de alto opcional, en píxeles, desde la parte inferior de la ventana.
         * */
        offset: INITIAL_OFFSET
    }

    $.notify = {
        _push: function (options) {
            let $divNotify;
            if (typeof options.description == 'undefined' || options.description == null || options.description == '') {
                $divNotify = $(_formatString(DIV_NOTIFY, options.message));
            }
            else {
                $divNotify = $(_formatString(DIV_NOTIFY_DESCRIPTION, options.message, options.description));
            }

            $divNotify.css({ bottom: _calculateTotalOffset(options.offset) });

            if (options.closeButton == true) {
                $divNotify.find(".message-container").append(DIV_NOTIFY_CLOSE_BUTTON);
                $divNotify.find(".close").on("click", function () {
                    _onClose($divNotify);
                });
                $divNotify.on('mousedown', function (e) {
                    if (e.which === 2) {
                        _onClose($divNotify);
                    }
                });
            }

            if (options.titleBold == false) {
                $divNotify.find(".message").css('font-weight', 'normal');
            }

            if (typeof options.type != 'undefined' && options.type != null) {
                switch (options.type.trim()) {
                    case _notificationTypes.success:
                        _setCSS($divNotify, _notificationColors.success.text, _notificationColors.success.background, _notificationColors.success.backgroundTitle, _notificationTypes.success);
                        break;
                    case _notificationTypes.warning:
                        _setCSS($divNotify, _notificationColors.warning.text, _notificationColors.warning.background, _notificationColors.warning.backgroundTitle, _notificationTypes.warning);
                        break;
                    case _notificationTypes.info:
                        _setCSS($divNotify, _notificationColors.info.text, _notificationColors.info.background, _notificationColors.info.backgroundTitle, _notificationTypes.info);
                        break;
                    case _notificationTypes.error:
                        _setCSS($divNotify, _notificationColors.error.text, _notificationColors.error.background, _notificationColors.error.backgroundTitle, _notificationTypes.error);
                        break;
                    default:
                        _setCSS($divNotify, _notificationColors.default.text, _notificationColors.default.background, _notificationColors.default.backgroundTitle, _notificationTypes.default);
                }
            }
            else {
                _setCSS($divNotify, _notificationColors.default.text, _notificationColors.default.background, _notificationColors.default.backgroundTitle, _notificationTypes.default);
            }

            $('body').append($divNotify);

            jnotifyCollection.sort(_sortById);
            let newId = jnotifyCollection.length == 0 ? 1 : jnotifyCollection[jnotifyCollection.length - 1].id + 1;
            jnotifyCollection.push({ id: newId, element: $divNotify });

            if (options.delay <= 0 && options.closeButton == true) {
                $divNotify.fadeIn(options.fadeDelay);
            }
            else {
                $divNotify.fadeIn(options.fadeDelay, function onFadeIn() {
                    setTimeout(function () {
                        $divNotify.fadeOut(options.fadeDelay, function onFadeOut() {
                            _onClose($divNotify);
                        });
                    }, options.delay);
                });
            }
        },

        _removeAll: function (fadeOutDelay) {
            for (let i = 0; i < jnotifyCollection.length; i++) {
                let divElement = jnotifyCollection[i].element;
                let fadeDelay = typeof fadeOutDelay != 'undefined' && fadeOutDelay != null ? fadeOutDelay : 1000;
                divElement.fadeOut(fadeOutDelay, function onFadeOut() {
                    _onClose(divElement);
                });
            }
        }
    }

    /**
     * Envía una notificación push de éxito con el titulo, mensaje y opciones especificadas.
     * */
    jNotify.success = function (message, description, options) {
        let mergedOptions = _mergeOptions(message, description, notifyOptions, options);
        mergedOptions.type = _notificationTypes.success;
        $.notify._push(mergedOptions);
    }

    /**
     * Envía una notificación push de información con el titulo, mensaje y opciones especificadas.
     * */
    jNotify.info = function (message, description, options) {
        let mergedOptions = _mergeOptions(message, description, notifyOptions, options);
        mergedOptions.type = _notificationTypes.info;
        $.notify._push(mergedOptions);
    }

    /**
     * Envía una notificación push de advertencia con el titulo, mensaje y opciones especificadas.
     * */
    jNotify.warning = function (message, description, options) {
        let mergedOptions = _mergeOptions(message, description, notifyOptions, options);
        mergedOptions.type = _notificationTypes.warning;
        $.notify._push(mergedOptions);
    }

    /**
     * Envía una notificación push de error con el titulo, mensaje y opciones especificadas.
     * */
    jNotify.error = function (message, description, options) {
        let mergedOptions = _mergeOptions(message, description, notifyOptions, options);
        mergedOptions.type = _notificationTypes.error;
        $.notify._push(mergedOptions);
    }

    /**
     * Envía una notificación push con el titulo, mensaje y opciones especificadas.
     * */
    jNotify.push = function (message, description, options) {
        let mergedOptions = _mergeOptions(message, description, notifyOptions, options);
        $.notify._push(mergedOptions);
    }

    /**
     * Limpia todas las notificaciones activas de la página actual.
     * @param {any} fadeOutDelay Tiempo en milisegundos que tardará la notificación en desaparecer.
     */
    jNotify.clear = function (fadeOutDelay) {
        $.notify._removeAll(fadeOutDelay);
    }

})(jQuery);