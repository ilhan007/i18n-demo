/**
 *
 *
 * @author Jerry Bendy <jerry@icewingcc.com>
 * @licence MIT
 *
 */

(function(self) {

    var nativeURLSearchParams = self.URLSearchParams ? self.URLSearchParams : null,
        isSupportObjectConstructor = nativeURLSearchParams && (new nativeURLSearchParams({a: 1})).toString() === 'a=1',
        // There is a bug in safari 10.1 (and earlier) that incorrectly decodes `%2B` as an empty space and not a plus.
        decodesPlusesCorrectly = nativeURLSearchParams && (new nativeURLSearchParams('s=%2B').get('s') === '+'),
        __URLSearchParams__ = "__URLSearchParams__",
        // Fix bug in Edge which cannot encode ' &' correctly
        encodesAmpersandsCorrectly = nativeURLSearchParams ? (function() {
            var ampersandTest = new nativeURLSearchParams();
            ampersandTest.append('s', ' &');
            return ampersandTest.toString() === 's=+%26';
        })() : true,
        prototype = URLSearchParamsPolyfill.prototype,
        iterable = !!(self.Symbol && self.Symbol.iterator);

    if (nativeURLSearchParams && isSupportObjectConstructor && decodesPlusesCorrectly && encodesAmpersandsCorrectly) {
        return;
    }


    /**
     * Make a URLSearchParams instance
     *
     * @param {object|string|URLSearchParams} search
     * @constructor
     */
    function URLSearchParamsPolyfill(search) {
        search = search || "";

        // support construct object with another URLSearchParams instance
        if (search instanceof URLSearchParams || search instanceof URLSearchParamsPolyfill) {
            search = search.toString();
        }
        this [__URLSearchParams__] = parseToDict(search);
    }


    /**
     * Appends a specified key/value pair as a new search parameter.
     *
     * @param {string} name
     * @param {string} value
     */
    prototype.append = function(name, value) {
        appendTo(this [__URLSearchParams__], name, value);
    };

    /**
     * Deletes the given search parameter, and its associated value,
     * from the list of all search parameters.
     *
     * @param {string} name
     */
    prototype.delete = function(name) {
        delete this [__URLSearchParams__] [name];
    };

    /**
     * Returns the first value associated to the given search parameter.
     *
     * @param {string} name
     * @returns {string|null}
     */
    prototype.get = function(name) {
        var dict = this [__URLSearchParams__];
        return name in dict ? dict[name][0] : null;
    };

    /**
     * Returns all the values association with a given search parameter.
     *
     * @param {string} name
     * @returns {Array}
     */
    prototype.getAll = function(name) {
        var dict = this [__URLSearchParams__];
        return name in dict ? dict [name].slice(0) : [];
    };

    /**
     * Returns a Boolean indicating if such a search parameter exists.
     *
     * @param {string} name
     * @returns {boolean}
     */
    prototype.has = function(name) {
        return name in this [__URLSearchParams__];
    };

    /**
     * Sets the value associated to a given search parameter to
     * the given value. If there were several values, delete the
     * others.
     *
     * @param {string} name
     * @param {string} value
     */
    prototype.set = function set(name, value) {
        this [__URLSearchParams__][name] = ['' + value];
    };

    /**
     * Returns a string containg a query string suitable for use in a URL.
     *
     * @returns {string}
     */
    prototype.toString = function() {
        var dict = this[__URLSearchParams__], query = [], i, key, name, value;
        for (key in dict) {
            name = encode(key);
            for (i = 0, value = dict[key]; i < value.length; i++) {
                query.push(name + '=' + encode(value[i]));
            }
        }
        return query.join('&');
    };

    // There is a bug in Safari 10.1 and `Proxy`ing it is not enough.
    var forSureUsePolyfill = !decodesPlusesCorrectly;
    var useProxy = (!forSureUsePolyfill && nativeURLSearchParams && !isSupportObjectConstructor && self.Proxy);
    /*
     * Apply polifill to global object and append other prototype into it
     */
    self.URLSearchParams = useProxy ?
        // Safari 10.0 doesn't support Proxy, so it won't extend URLSearchParams on safari 10.0
        new Proxy(nativeURLSearchParams, {
            construct: function(target, args) {
                return new target((new URLSearchParamsPolyfill(args[0]).toString()));
            }
        }) :
        URLSearchParamsPolyfill;


    var USPProto = self.URLSearchParams.prototype;

    USPProto.polyfill = true;

    /**
     *
     * @param {function} callback
     * @param {object} thisArg
     */
    USPProto.forEach = USPProto.forEach || function(callback, thisArg) {
        var dict = parseToDict(this.toString());
        Object.getOwnPropertyNames(dict).forEach(function(name) {
            dict[name].forEach(function(value) {
                callback.call(thisArg, value, name, this);
            }, this);
        }, this);
    };

    /**
     * Sort all name-value pairs
     */
    USPProto.sort = USPProto.sort || function() {
        var dict = parseToDict(this.toString()), keys = [], k, i, j;
        for (k in dict) {
            keys.push(k);
        }
        keys.sort();

        for (i = 0; i < keys.length; i++) {
            this.delete(keys[i]);
        }
        for (i = 0; i < keys.length; i++) {
            var key = keys[i], values = dict[key];
            for (j = 0; j < values.length; j++) {
                this.append(key, values[j]);
            }
        }
    };

    /**
     * Returns an iterator allowing to go through all keys of
     * the key/value pairs contained in this object.
     *
     * @returns {function}
     */
    USPProto.keys = USPProto.keys || function() {
        var items = [];
        this.forEach(function(item, name) {
            items.push(name);
        });
        return makeIterator(items);
    };

    /**
     * Returns an iterator allowing to go through all values of
     * the key/value pairs contained in this object.
     *
     * @returns {function}
     */
    USPProto.values = USPProto.values || function() {
        var items = [];
        this.forEach(function(item) {
            items.push(item);
        });
        return makeIterator(items);
    };

    /**
     * Returns an iterator allowing to go through all key/value
     * pairs contained in this object.
     *
     * @returns {function}
     */
    USPProto.entries = USPProto.entries || function() {
        var items = [];
        this.forEach(function(item, name) {
            items.push([name, item]);
        });
        return makeIterator(items);
    };


    if (iterable) {
        USPProto[self.Symbol.iterator] = USPProto[self.Symbol.iterator] || USPProto.entries;
    }


    function encode(str) {
        var replace = {
            '!': '%21',
            "'": '%27',
            '(': '%28',
            ')': '%29',
            '~': '%7E',
            '%20': '+',
            '%00': '\x00'
        };
        return encodeURIComponent(str).replace(/[!'\(\)~]|%20|%00/g, function(match) {
            return replace[match];
        });
    }

    function decode(str) {
        return decodeURIComponent(str.replace(/\+/g, ' '));
    }

    function makeIterator(arr) {
        var iterator = {
            next: function() {
                var value = arr.shift();
                return {done: value === undefined, value: value};
            }
        };

        if (iterable) {
            iterator[self.Symbol.iterator] = function() {
                return iterator;
            };
        }

        return iterator;
    }

    function parseToDict(search) {
        var dict = {};

        if (typeof search === "object") {
            for (var key in search) {
                if (search.hasOwnProperty(key)) {
                    appendTo(dict, key, search[key]);
                }
            }

        } else {
            // remove first '?'
            if (search.indexOf("?") === 0) {
                search = search.slice(1);
            }

            var pairs = search.split("&");
            for (var j = 0; j < pairs.length; j++) {
                var value = pairs [j],
                    index = value.indexOf('=');

                if (-1 < index) {
                    appendTo(dict, decode(value.slice(0, index)), decode(value.slice(index + 1)));

                } else {
                    if (value) {
                        appendTo(dict, decode(value), '');
                    }
                }
            }
        }

        return dict;
    }

    function appendTo(dict, name, value) {
        var val = typeof value === 'string' ? value : (
            value !== null && value !== undefined && typeof value.toString === 'function' ? value.toString() : JSON.stringify(value)
        );

        if (name in dict) {
            dict[name].push(val);
        } else {
            dict[name] = [val];
        }
    }

})(typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : window));

const patchNodeValue = () => {
	if (!window.ShadyDOM) {
		return;
	}
	const nativeNodeValue = Object.getOwnPropertyDescriptor(Node.prototype, "nodeValue");
	Object.defineProperty(Node.prototype, "nodeValue", {
		get() {
			return nativeNodeValue.get.apply(this);
		},
		set(text) {
			nativeNodeValue.set.apply(this, arguments); // eslint-disable-line

			// Call manually the mutation observer callback
			const parentElement = this.parentNode;
			if (parentElement instanceof Element && typeof parentElement._processChildren === "function") {
				parentElement._processChildren();
			}
		},
	});
};

patchNodeValue();

// URLSearchParams

const fetchPromises = new Map();
const jsonPromises = new Map();
const textPromises = new Map();

const fetchTextOnce = async url => {
	if (!fetchPromises.get(url)) {
		fetchPromises.set(url, fetch(url));
	}
	const response = await fetchPromises.get(url);

	if (!textPromises.get(url)) {
		textPromises.set(url, response.text());
	}

	return textPromises.get(url);
};

const fetchJsonOnce = async url => {
	if (!fetchPromises.get(url)) {
		fetchPromises.set(url, fetch(url));
	}
	const response = await fetchPromises.get(url);

	if (!jsonPromises.get(url)) {
		jsonPromises.set(url, response.json());
	}

	return jsonPromises.get(url);
};

const themeURLs = new Map();
const propertiesStyles = new Map();

const registerThemeProperties = (packageName, themeName, data) => {
	if (data.includes(":root")) {
		// inlined content
		propertiesStyles.set(`${packageName}_${themeName}`, data);
	} else {
		// url for fetching
		themeURLs.set(`${packageName}_${themeName}`, data);
	}
};

const getThemeProperties = async (packageName, themeName) => {
	const style = propertiesStyles.get(`${packageName}_${themeName}`);
	if (style) {
		return style;
	}

	const data = await fetchThemeProperties(packageName, themeName);
	propertiesStyles.set(`${packageName}_${themeName}`, data);
	return data;
};

const fetchThemeProperties = async (packageName, themeName) => {
	const url = themeURLs.get(`${packageName}_${themeName}`);

	if (!url) {
		throw new Error(`You have to import @ui5/webcomponents/dist/ThemePropertiesProvider module to use theme switching`);
	}
	return fetchTextOnce(url);
};

var belizeThemeProperties = ":root{--sapPrimary1:#3f5161;--sapPrimary2:#427cac;--sapPrimary3:#eff4f9;--sapPrimary4:#fff;--sapPrimary5:#fafafa;--sapPrimary6:#bfbfbf;--sapPrimary7:#333;--sapAccentColor1:#e09d00;--sapAccentColor2:#e6600d;--sapAccentColor3:#c14646;--sapAccentColor4:#ab218e;--sapAccentColor5:#678bc7;--sapAccentColor6:#0092d1;--sapAccentColor7:#1a9898;--sapAccentColor8:#759421;--sapAccentColor9:#925ace;--sapAccentColor10:#647987;--sapShellColor:transparent;--sapShell_BorderColor:transparent;--sapFontFamily:\"72\",\"72full\",Arial,Helvetica,sans-serif;--sapFontSize:calc(0.875*var(--sapContent_GridSize));--sapLinkColor:#0070b1;--sapCompanyLogo:none;--sapBackgroundImage:none;--sapBackgroundImageOpacity:1.0;--sapBackgroundImageRepeat:false;--sapContent_GridSize:1rem;--sapNegativeColor:#b00;--sapCriticalColor:#e78c07;--sapPositiveColor:#2b7c2b;--sapInformativeColor:#427cac;--sapNeutralColor:#5e696e;--sapIndicationColor_1:#800;--sapIndicationColor_2:#b00;--sapIndicationColor_3:#e78c07;--sapIndicationColor_4:#2b7c2b;--sapIndicationColor_5:#427cac;--sapElement_LineHeight:calc(3*var(--sapContent_GridSize, 1rem));--sapElement_Height:calc(2.5*var(--sapContent_GridSize, 1rem));--sapElement_BorderWidth:calc(0.0625*var(--sapContent_GridSize, 1rem));--sapContent_LineHeight:1.4;--sapContent_ElementHeight:1.37em;--sapContent_ElementHeight_PX:22px;--sapContent_ContrastTextColor:#fff;--sapContent_FocusColor:#000;--sapContent_ContrastFocusColor:#fff;--sapContent_ShadowColor:#000;--sapContent_ContrastShadowColor:#fff;--sapContent_SearchHighlightColor:#d4f7db;--sapContent_HelpColor:#3f8600;--sapContent_MonospaceFontFamily:lucida console,monospace;--sapContent_DisabledOpacity:0.5;--sapContent_ContrastTextThreshold:0.65;--sapButton_BorderCornerRadius:calc(0.2*var(--sapContent_GridSize, 1rem));--sapField_TextColor:#000;--sapField_BorderCornerRadius:0;--sapGroup_TitleBackground:transparent;--sapGroup_BorderCornerRadius:0;--sapGroup_FooterBackground:transparent;--sapToolbar_Background:transparent;--sapScrollBar_Dimension:calc(0.7*var(--sapContent_GridSize, 1rem));--sapBlockLayer_Background:#000;--sapTile_BorderColor:transparent;--sapUiFontCondensedFamily:\"Arial Narrow\",HelveticaNeue-CondensedBold,Arial,sans-serif;--sapUiFontHeaderWeight:normal;--sapMFontHeader1Size:1.625rem;--sapMFontHeader2Size:1.375rem;--sapMFontHeader3Size:1.250rem;--sapMFontHeader4Size:1.125rem;--sapMFontHeader5Size:1rem;--sapMFontHeader6Size:0.875rem;--sapMFontSmallSize:0.75rem;--sapMFontMediumSize:0.875rem;--sapMFontLargeSize:1rem;--sapUiTranslucentBGOpacity:0;--sapMPlatformDependent:false;--sapUiDesktopFontSize:12px;--sapUiFontLargeSize:13px;--sapUiFontSmallSize:11px;--sapUiFontHeader1Size:26px;--sapUiFontHeader2Size:20px;--sapUiFontHeader3Size:18px;--sapUiFontHeader4Size:16px;--sapUiFontHeader5Size:14px;--sapUiLineHeight:18px;--sapUiNotifierSeparatorWidth:1px;--sapUiButtonLiteBackground:transparent;--sapUiButtonLiteBorderColor:transparent;--sapUiListTableTextSize:0.875rem;--sapUiListTableIconSize:1rem;--_ui5_button_base_min_width:2.5rem;--_ui5_button_base_min_compact_width:2rem;--_ui5_button_base_height:2.5rem;--_ui5_button_compact_height:1.625rem;--_ui5_button_border_radius:0.2rem;--_ui5_button_base_padding:0 0.6875rem 0 0.6875rem;--_ui5_button_compact_padding:0 0.4375rem;--_ui5_button_base_icon_only_padding:0 0.5625rem;--_ui5_button_base_icon_margin:0.563rem;--_ui5_button_base_icon_only_font_size:1.375rem;--_ui5_button_focus_after_bottom:1px;--_ui5_button_focus_after_right:1px;--_ui5_button_focus_after_left:1px;--_ui5_button_focus_after_top:1px;--_ui5_button_emphasized_font_weight:normal;--_ui5_popover_arrow_shadow_color:rgba(0,0,0,0.3);--_ui5_popover_content_padding:.4375em;--_ui5_datepicker_icon_border:none;--_ui5_daypicker_item_margin:2px;--_ui5_daypicker_item_border:none;--_ui5_daypicker_item_outline_width:1px;--_ui5_daypicker_item_outline_offset:1px;--_ui5_daypicker_daynames_container_height:2rem;--_ui5_daypicker_weeknumbers_container_padding_top:2rem;--_ui5_daypicker_item_border_radius:0;--_ui5_daypicker_item_now_inner_border_radius:0;--_ui5_daypicker_item_now_selected_focus_after_width:calc(100% - 0.125rem);--_ui5_daypicker_item_now_selected_focus_after_height:calc(100% - 0.125rem);--_ui5_calendar_header_arrow_button_border:none;--_ui5_calendar_header_arrow_button_border_radius:0.25rem;--_ui5_calendar_header_middle_button_width:2.5rem;--_ui5_calendar_header_middle_button_flex:1;--_ui5_calendar_header_middle_button_focus_border_radius:0.25rem;--_ui5_calendar_header_middle_button_focus_border:none;--_ui5_calendar_header_middle_button_focus_after_display:block;--_ui5_calendar_header_middle_button_focus_after_width:calc(100% - 0.25rem);--_ui5_calendar_header_middle_button_focus_after_height:calc(100% - 0.25rem);--_ui5_calendar_header_middle_button_focus_after_top_offset:1px;--_ui5_calendar_header_middle_button_focus_after_left_offset:1px;--_ui5_card_content_padding:1rem;--_ui5_card_header_active_bg:#f0f0f0;--_ui5_card_header_hover_bg:#fafafa;--_ui5_checkbox_wrapper_padding:.8125rem;--_ui5_checkbox_width_height:3rem;--_ui5_checkbox_inner_width_height:1.375rem;--_ui5_checkbox_inner_border_radius:0;--_ui5_checkbox_wrapped_focus_padding:.375rem;--_ui5_checkbox_wrapped_content_margin_top:.125rem;--_ui5_checkbox_wrapped_focus_left_top_bottom_position:.5625rem;--_ui5_checkbox_focus_position:.6875rem;--_ui5_checkbox_compact_wrapper_padding:.5rem;--_ui5_checkbox_compact_width_height:2rem;--_ui5_checkbox_compact_inner_size:1rem;--_ui5_checkbox_compact_focus_position:.375rem;--_ui5_checkbox_compact_wrapped_label_margin_top:-1px;--_ui5_input_height:2.5rem;--_ui5_input_compact_height:1.625rem;--_ui5_input_wrapper_border_radius:0;--_ui5_input_state_border_width:0.125rem;--_ui5_input_error_font_weight:normal;--_ui5_input_focus_border_width:1px;--_ui5_input_error_warning_border_style:solid;--_ui5_input_error_warning_font_style:normal;--_ui5_input_disabled_font_weight:normal;--sap_wc_input_disabled_opacity:0.5;--sap_wc_input_icon_min_width:2.375rem;--sap_wc_input_compact_min_width:2rem;--_ui5_link_opacity:0.5;--_ui5_link_outline_element_size:calc(100% - 0.125rem);--_ui5_listitembase_focus_width:1px;--_ui5_messagestrip_icon_width:2.5rem;--_ui5_messagestrip_border_radius:0.1875rem;--_ui5_messagestrip_button_border_width:0;--_ui5_messagestrip_button_border_style:none;--_ui5_messagestrip_button_border_color:transparent;--_ui5_messagestrip_button_border_radius:0;--_ui5_messagestrip_padding:0.125rem .125rem;--_ui5_messagestrip_button_height:1.625rem;--_ui5_messagestrip_border_width:1px;--_ui5_messagestrip_close_button_border:none;--_ui5_messagestrip_close_button_size:1.625rem;--_ui5_messagestrip_icon_top:0.4375rem;--_ui5_messagestrip_focus_width:1px;--_ui5_monthpicker_item_border_radius:0;--_ui5_monthpicker_item_border:none;--_ui5_monthpicker_item_margin:1px;--_ui5_monthpicker_item_focus_after_width:calc(100% - 0.375rem);--_ui5_monthpicker_item_focus_after_height:calc(100% - 0.375rem);--_ui5_monthpicker_item_focus_after_offset:2px;--_ui5_radiobutton_border_width:1px;--_ui5_radiobutton_warning_error_border_dash:0;--_ui5_select_state_error_warning_border_style:solid;--_ui5_select_state_error_warning_border_width:0.125rem;--_ui5_select_hover_icon_left_border:none;--_ui5_select_rtl_hover_icon_left_border:none;--_ui5_select_rtl_hover_icon_right_border:none;--_ui5_select_focus_width:1px;--_ui5_switch_height:2.75rem;--_ui5_switch_width:3.875rem;--_ui5_switch_no_label_width:3.25rem;--_ui5_switch_outline:1px;--_ui5_switch_compact_height:2rem;--_ui5_switch_compact_width:3.5rem;--_ui5_switch_compact_no_label_width:2.5rem;--_ui5_switch_track_height:1.375rem;--_ui5_switch_track_no_label_height:1.25rem;--_ui5_switch_track_compact_no_label_height:1rem;--_ui5_switch_track_border_radius:0.75rem;--_ui5_switch_handle_width:2rem;--_ui5_switch_handle_height:2rem;--_ui5_switch_handle_border_width:1px;--_ui5_switch_handle_border_radius:1rem;--_ui5_switch_handle_compact_width:1.625rem;--_ui5_switch_handle_compact_height:1.625rem;--_ui5_tc_headerItemSemanticIcon_display:none;--_ui5_textarea_focus_after_width:1px;--_ui5_textarea_warning_border_style:solid;--_ui5_textarea_warning_border_width:2px;--_ui5_TimelineItem_arrow_size:1.625rem;--_ui5_TimelineItem_bubble_outline_width:0.0625rem;--_ui5_TimelineItem_bubble_outline_top:-0.125rem;--_ui5_TimelineItem_bubble_outline_right:-0.125rem;--_ui5_TimelineItem_bubble_outline_bottom:-0.125rem;--_ui5_TimelineItem_bubble_outline_left:-0.625rem;--_ui5_TimelineItem_bubble_rtl_left_offset:-0.125rem;--_ui5_TimelineItem_bubble_rtl_right_offset:-0.625rem;--_ui5_yearpicker_item_border:none;--_ui5_yearpicker_item_border_radius:0;--_ui5_yearpicker_item_margin:1px;--_ui5_yearpicker_item_focus_after_width:calc(100% - 0.375rem);--_ui5_yearpicker_item_focus_after_height:calc(100% - 0.375rem);--_ui5_yearpicker_item_focus_after_offset:2px;--_ui5_token_border_radius:0.125rem;--sapBrandColor:var(--sapPrimary2,#427cac);--sapBaseColor:var(--sapPrimary3,#eff4f9);--sapBackgroundColorDefault:var(--sapPrimary5,#fafafa);--sapBackgroundColor:var(--sapPrimary5,#fafafa);--sapTextColor:var(--sapPrimary7,#333);--sapNegativeElementColor:var(--sapNegativeColor,#b00);--sapNegativeTextColor:var(--sapNegativeColor,#b00);--sapCriticalElementColor:var(--sapCriticalColor,#e78c07);--sapCriticalTextColor:var(--sapCriticalColor,#e78c07);--sapPositiveElementColor:var(--sapPositiveColor,#2b7c2b);--sapPositiveTextColor:var(--sapPositiveColor,#2b7c2b);--sapInformationBorderColor:var(--sapInformativeColor,#427cac);--sapInformativeElementColor:var(--sapInformativeColor,#427cac);--sapInformativeTextColor:var(--sapInformativeColor,#427cac);--sapNeutralBorderColor:var(--sapNeutralColor,#5e696e);--sapNeutralElementColor:var(--sapNeutralColor,#5e696e);--sapNeutralTextColor:var(--sapNeutralColor,#5e696e);--sapInformationColor:var(--sapInformativeColor,#427cac);--sapContent_IconHeight:var(--sapContent_GridSize,1rem);--sapContent_ContrastIconColor:var(--sapContent_ContrastTextColor,#fff);--sapContent_MarkerIconColor:var(--sapAccentColor5,#678bc7);--sapContent_ForegroundBorderColor:var(--sapPrimary6,#bfbfbf);--sapContent_BadgeBackground:var(--sapAccentColor3,#c14646);--sapButton_BorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapField_Background:var(--sapPrimary4,#fff);--sapField_BorderColor:var(--sapPrimary6,#bfbfbf);--sapField_BorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapField_RequiredColor:var(--sapAccentColor3,#c14646);--sapGroup_BorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapList_BorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapList_Background:var(--sapPrimary4,#fff);--sapPageFooter_Background:var(--sapPrimary4,#fff);--sapTile_Background:var(--sapPrimary4,#fff);--sapUiShellColor:var(--sapShellColor,transparent);--sapUiFontFamily:var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif);--sapUiFontSize:var(--sapFontSize,calc(0.875*var(--sapContent_GridSize)));--sapUiLink:var(--sapLinkColor,#0070b1);--sapUiGlobalLogo:var(--sapCompanyLogo,none);--sapUiGlobalBackgroundImage:var(--sapBackgroundImage,none);--sapUiBackgroundImage:var(--sapBackgroundImage,none);--sapUiGlobalBackgroundImageOpacity:var(--sapBackgroundImageOpacity,1.0);--sapUiGlobalBackgroundRepeat:var(--sapBackgroundImageRepeat,false);--sapUiElementLineHeight:var(--sapElement_LineHeight,calc(3*var(--sapContent_GridSize, 1rem)));--sapUiElementHeight:var(--sapElement_Height,calc(2.5*var(--sapContent_GridSize, 1rem)));--sapUiElementBorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapUiContentLineHeight:var(--sapContent_LineHeight,1.4);--sapUiContentElementHeight:var(--sapContent_ElementHeight,1.37em);--sapUiContentElementHeightPX:var(--sapContent_ElementHeight_PX,22px);--sapUiContentFocusColor:var(--sapContent_FocusColor,#000);--sapUiContentContrastFocusColor:var(--sapContent_ContrastFocusColor,#fff);--sapUiContentShadowColor:var(--sapContent_ShadowColor,#000);--sapUiContentContrastShadowColor:var(--sapContent_ContrastShadowColor,#fff);--sapUiContentSearchHighlightColor:var(--sapContent_SearchHighlightColor,#d4f7db);--sapUiContentHelpColor:var(--sapContent_HelpColor,#3f8600);--sapUiContentDisabledOpacity:var(--sapContent_DisabledOpacity,0.5);--sapUiContentContrastTextThreshold:var(--sapContent_ContrastTextThreshold,0.65);--sapUiContentContrastTextColor:var(--sapContent_ContrastTextColor,#fff);--sapUiShellBorderColor:var(--sapShell_BorderColor,transparent);--sapUiButtonBorderCornerRadius:var(--sapButton_BorderCornerRadius,calc(0.2*var(--sapContent_GridSize, 1rem)));--sapUiFieldBorderCornerRadius:var(--sapField_BorderCornerRadius,0);--sapUiFieldTextColor:var(--sapField_TextColor,#000);--sapUiGroupTitleBackground:var(--sapGroup_TitleBackground,transparent);--sapUiGroupFooterBackground:var(--sapGroup_FooterBackground,transparent);--sapUiToolbarBackground:var(--sapToolbar_Background,transparent);--sapUiScrollBarDimension:var(--sapScrollBar_Dimension,calc(0.7*var(--sapContent_GridSize, 1rem)));--sapUiBlockLayerBackground:var(--sapBlockLayer_Background,#000);--sapUiTileBorderColor:var(--sapTile_BorderColor,transparent);--sapUiContentGridSize:var(--sapContent_GridSize,1rem);--sapUiPrimary1:var(--sapPrimary1,#3f5161);--sapUiPrimary2:var(--sapPrimary2,#427cac);--sapUiPrimary3:var(--sapPrimary3,#eff4f9);--sapUiPrimary4:var(--sapPrimary4,#fff);--sapUiPrimary5:var(--sapPrimary5,#fafafa);--sapUiPrimary6:var(--sapPrimary6,#bfbfbf);--sapUiPrimary7:var(--sapPrimary7,#333);--sapUiAccent1:var(--sapAccentColor1,#e09d00);--sapUiAccent2:var(--sapAccentColor2,#e6600d);--sapUiAccent3:var(--sapAccentColor3,#c14646);--sapUiAccent4:var(--sapAccentColor4,#ab218e);--sapUiAccent5:var(--sapAccentColor5,#678bc7);--sapUiAccent6:var(--sapAccentColor6,#0092d1);--sapUiAccent7:var(--sapAccentColor7,#1a9898);--sapUiAccent8:var(--sapAccentColor8,#759421);--sapUiAccent9:var(--sapAccentColor9,#925ace);--sapUiAccent10:var(--sapAccentColor10,#647987);--sapUiNeutralBorder:var(--sapNeutralColor,#5e696e);--sapUiNegative:var(--sapNegativeColor,#b00);--sapUiCritical:var(--sapCriticalColor,#e78c07);--sapUiPositive:var(--sapPositiveColor,#2b7c2b);--sapUiInformative:var(--sapInformativeColor,#427cac);--sapUiNeutral:var(--sapNeutralColor,#5e696e);--sapUiIndication1:var(--sapIndicationColor_1,#800);--sapUiIndication2:var(--sapIndicationColor_2,#b00);--sapUiIndication3:var(--sapIndicationColor_3,#e78c07);--sapUiIndication4:var(--sapIndicationColor_4,#2b7c2b);--sapUiIndication5:var(--sapIndicationColor_5,#427cac);--sapUiFontHeader6Size:var(--sapUiFontLargeSize,13px);--sapGroup_Title_FontSize:var(--sapFontSize,calc(0.875*var(--sapContent_GridSize)));--sapHighlightColor:var(--sapBrandColor,var(--sapPrimary2,#427cac));--sapUiBrand:var(--sapBrandColor,var(--sapPrimary2,#427cac));--sapPageHeader_Background:var(--sapBaseColor,var(--sapPrimary3,#eff4f9));--sapObjectHeader_Background:var(--sapBaseColor,var(--sapPrimary3,#eff4f9));--sapUiBaseColor:var(--sapBaseColor,var(--sapPrimary3,#eff4f9));--sapUiBaseBG:var(--sapBackgroundColor,var(--sapPrimary5,#fafafa));--sapUiGlobalBackgroundColor:var(--sapBackgroundColor,var(--sapPrimary5,#fafafa));--sapTitleColor:var(--sapTextColor,var(--sapPrimary7,#333));--sapUiBaseText:var(--sapTextColor,var(--sapPrimary7,#333));--sapUiNegativeElement:var(--sapNegativeElementColor,var(--sapNegativeColor,#b00));--sapUiNegativeText:var(--sapNegativeTextColor,var(--sapNegativeColor,#b00));--sapUiCriticalElement:var(--sapCriticalElementColor,var(--sapCriticalColor,#e78c07));--sapUiCriticalText:var(--sapCriticalTextColor,var(--sapCriticalColor,#e78c07));--sapUiPositiveElement:var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b));--sapUiPositiveText:var(--sapPositiveTextColor,var(--sapPositiveColor,#2b7c2b));--sapUiInformationBorder:var(--sapInformationBorderColor,var(--sapInformativeColor,#427cac));--sapUiInformativeElement:var(--sapInformativeElementColor,var(--sapInformativeColor,#427cac));--sapUiInformativeText:var(--sapInformativeTextColor,var(--sapInformativeColor,#427cac));--sapUiNeutralElement:var(--sapNeutralElementColor,var(--sapNeutralColor,#5e696e));--sapUiNeutralText:var(--sapNeutralTextColor,var(--sapNeutralColor,#5e696e));--sapField_InformationColor:var(--sapInformationColor,var(--sapInformativeColor,#427cac));--sapUiContentIconHeight:var(--sapContent_IconHeight,var(--sapContent_GridSize,1rem));--sapUiContentContrastIconColor:var(--sapContent_ContrastIconColor,var(--sapContent_ContrastTextColor,#fff));--sapUiContentMarkerIconColor:var(--sapContent_MarkerIconColor,var(--sapAccentColor5,#678bc7));--sapUiContentForegroundBorderColor:var(--sapContent_ForegroundBorderColor,var(--sapPrimary6,#bfbfbf));--sapUiContentBadgeBackground:var(--sapContent_BadgeBackground,var(--sapAccentColor3,#c14646));--sapUiButtonBorderWidth:var(--sapButton_BorderWidth,var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem))));--sapField_HelpBackground:var(--sapField_Background,var(--sapPrimary4,#fff));--sapField_Hover_Background:var(--sapField_Background,var(--sapPrimary4,#fff));--sapField_Focus_Background:var(--sapField_Background,var(--sapPrimary4,#fff));--sapField_InvalidBackground:var(--sapField_Background,var(--sapPrimary4,#fff));--sapField_WarningBackground:var(--sapField_Background,var(--sapPrimary4,#fff));--sapField_SuccessBackground:var(--sapField_Background,var(--sapPrimary4,#fff));--sapField_InformationBackground:var(--sapField_Background,var(--sapPrimary4,#fff));--sapUiFieldBackground:var(--sapField_Background,var(--sapPrimary4,#fff));--sapField_Focus_BorderColor:var(--sapField_BorderColor,var(--sapPrimary6,#bfbfbf));--sapUiFieldBorderColor:var(--sapField_BorderColor,var(--sapPrimary6,#bfbfbf));--sapUiFieldBorderWidth:var(--sapField_BorderWidth,var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem))));--sapUiFieldRequiredColor:var(--sapField_RequiredColor,var(--sapAccentColor3,#c14646));--sapUiGroupBorderWidth:var(--sapGroup_BorderWidth,var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem))));--sapUiListBorderWidth:var(--sapList_BorderWidth,var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem))));--sapUiListBackground:var(--sapList_Background,var(--sapPrimary4,#fff));--sapUiPageFooterBackground:var(--sapPageFooter_Background,var(--sapPrimary4,#fff));--sapUiTileBackground:var(--sapTile_Background,var(--sapPrimary4,#fff));--sapUiFontHeaderFamily:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));--sapUiDesktopFontFamily:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));--sapUiLinkActive:var(--sapUiLink,var(--sapLinkColor,#0070b1));--sapUiLinkVisited:var(--sapUiLink,var(--sapLinkColor,#0070b1));--sapUiLinkHover:var(--sapUiLink,var(--sapLinkColor,#0070b1));--sapUiDragAndDropActiveColor:var(--sapUiLink,var(--sapLinkColor,#0070b1));--sapUiDragAndDropActiveBorderColor:var(--sapUiLink,var(--sapLinkColor,#0070b1));--_ui5_button_focus_after_border:1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));--_ui5_button_positive_border_focus_hover_color:var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));--_ui5_card_header_focus_border:1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));--_ui5_checkbox_focus_outline:1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));--_ui5_monthpicker_item_focus_after_border:1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));--_ui5_panel_focus_border:1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));--_ui5_tc_headerItem_focus_border:1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));--_ui5_yearpicker_item_focus_after_border:1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));--sapUiFieldActiveTextColor:var(--sapUiContentContrastTextColor,var(--sapContent_ContrastTextColor,#fff));--ui5-badge-border-color-scheme-1:var(--sapUiAccent1,var(--sapAccentColor1,#e09d00));--ui5-badge-border-color-scheme-2:var(--sapUiAccent2,var(--sapAccentColor2,#e6600d));--ui5-badge-border-color-scheme-3:var(--sapUiAccent3,var(--sapAccentColor3,#c14646));--sapUiCalendarColorToday:var(--sapUiAccent4,var(--sapAccentColor4,#ab218e));--ui5-badge-border-color-scheme-4:var(--sapUiAccent4,var(--sapAccentColor4,#ab218e));--ui5-badge-border-color-scheme-5:var(--sapUiAccent5,var(--sapAccentColor5,#678bc7));--ui5-badge-border-color-scheme-6:var(--sapUiAccent6,var(--sapAccentColor6,#0092d1));--ui5-busyindicator-color:var(--sapUiAccent6,var(--sapAccentColor6,#0092d1));--ui5-badge-border-color-scheme-7:var(--sapUiAccent7,var(--sapAccentColor7,#1a9898));--ui5-badge-border-color-scheme-8:var(--sapUiAccent8,var(--sapAccentColor8,#759421));--ui5-badge-border-color-scheme-9:var(--sapUiAccent9,var(--sapAccentColor9,#925ace));--ui5-badge-border-color-scheme-10:var(--sapUiAccent10,var(--sapAccentColor10,#647987));--_ui5_tc_headerItem_negative_selected_border_color:var(--sapUiNegative,var(--sapNegativeColor,#b00));--_ui5_tc_headerItemIcon_negative_selected_background:var(--sapUiNegative,var(--sapNegativeColor,#b00));--_ui5_tc_headerItem_critical_selected_border_color:var(--sapUiCritical,var(--sapCriticalColor,#e78c07));--_ui5_tc_headerItemIcon_critical_selected_background:var(--sapUiCritical,var(--sapCriticalColor,#e78c07));--_ui5_tc_headerItem_positive_selected_border_color:var(--sapUiPositive,var(--sapPositiveColor,#2b7c2b));--_ui5_tc_headerItemIcon_positive_selected_background:var(--sapUiPositive,var(--sapPositiveColor,#2b7c2b));--_ui5_tc_headerItem_neutral_selected_border_color:var(--sapUiNeutral,var(--sapNeutralColor,#5e696e));--_ui5_tc_headerItemIcon_neutral_selected_background:var(--sapUiNeutral,var(--sapNeutralColor,#5e696e));--sapSelectedColor:var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)));--sapActiveColor:var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)));--sapField_Hover_BorderColor:var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)));--sapField_Hover_HelpBackground:var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)));--sapList_HighlightColor:var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)));--sapUiHighlight:var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)));--sapUiPageHeaderBackground:var(--sapPageHeader_Background,var(--sapBaseColor,var(--sapPrimary3,#eff4f9)));--sapUiObjectHeaderBackground:var(--sapObjectHeader_Background,var(--sapBaseColor,var(--sapPrimary3,#eff4f9)));--sapUiTextTitle:var(--sapTitleColor,var(--sapTextColor,var(--sapPrimary7,#333)));--sapUiListTextColor:var(--sapUiBaseText,var(--sapTextColor,var(--sapPrimary7,#333)));--_ui5_switch_text_disabled_color:var(--sapUiBaseText,var(--sapTextColor,var(--sapPrimary7,#333)));--sapUiButtonRejectBorderColor:var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00)));--sapUiButtonRejectActiveBackground:var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00)));--_ui5_switch_text_off_semantic_color:var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00)));--sapUiButtonAcceptBorderColor:var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b)));--sapUiButtonAcceptActiveBackground:var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b)));--_ui5_switch_text_on_semantic_color:var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b)));--sapUiFieldInformationColor:var(--sapField_InformationColor,var(--sapInformationColor,var(--sapInformativeColor,#427cac)));--sapUiDragAndDropBorderColor:var(--sapUiContentForegroundBorderColor,var(--sapContent_ForegroundBorderColor,var(--sapPrimary6,#bfbfbf)));--_ui5_switch_track_disabled_border_color:var(--sapUiContentForegroundBorderColor,var(--sapContent_ForegroundBorderColor,var(--sapPrimary6,#bfbfbf)));--_ui5_switch_handle_disabled_border_color:var(--sapUiContentForegroundBorderColor,var(--sapContent_ForegroundBorderColor,var(--sapPrimary6,#bfbfbf)));--sapUiFieldHelpBackground:var(--sapField_HelpBackground,var(--sapField_Background,var(--sapPrimary4,#fff)));--sapUiFieldHoverBackground:var(--sapField_Hover_Background,var(--sapField_Background,var(--sapPrimary4,#fff)));--sapField_Focus_HelpBackground:var(--sapField_Focus_Background,var(--sapField_Background,var(--sapPrimary4,#fff)));--sapUiFieldFocusBackground:var(--sapField_Focus_Background,var(--sapField_Background,var(--sapPrimary4,#fff)));--sapUiFieldInvalidBackground:var(--sapField_InvalidBackground,var(--sapField_Background,var(--sapPrimary4,#fff)));--sapUiFieldWarningBackground:var(--sapField_WarningBackground,var(--sapField_Background,var(--sapPrimary4,#fff)));--sapUiFieldSuccessBackground:var(--sapField_SuccessBackground,var(--sapField_Background,var(--sapPrimary4,#fff)));--sapUiFieldInformationBackground:var(--sapField_InformationBackground,var(--sapField_Background,var(--sapPrimary4,#fff)));--_ui5_input_disabled_background:var(--sapUiFieldBackground,var(--sapField_Background,var(--sapPrimary4,#fff)));--_ui5_select_disabled_background:var(--sapUiFieldBackground,var(--sapField_Background,var(--sapPrimary4,#fff)));--sapUiFieldFocusBorderColor:var(--sapField_Focus_BorderColor,var(--sapField_BorderColor,var(--sapPrimary6,#bfbfbf)));--_ui5_checkbox_inner_border:solid .125rem var(--sapUiFieldBorderColor,var(--sapField_BorderColor,var(--sapPrimary6,#bfbfbf)));--_ui5_input_disabled_border_color:var(--sapUiFieldBorderColor,var(--sapField_BorderColor,var(--sapPrimary6,#bfbfbf)));--_ui5_select_disabled_border_color:var(--sapUiFieldBorderColor,var(--sapField_BorderColor,var(--sapPrimary6,#bfbfbf)));--sapUiButtonActionSelectBackground:var(--sapUiListBackground,var(--sapList_Background,var(--sapPrimary4,#fff)));--sapUiListGroupHeaderBackground:var(--sapUiListBackground,var(--sapList_Background,var(--sapPrimary4,#fff)));--_ui5_daypicker_item_othermonth_background_color:var(--sapUiListBackground,var(--sapList_Background,var(--sapPrimary4,#fff)));--ui5-listitem-background-color:var(--sapUiListBackground,var(--sapList_Background,var(--sapPrimary4,#fff)));--sapUiSelected:var(--sapSelectedColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))));--sapUiActive:var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))));--sapUiFieldHoverBorderColor:var(--sapField_Hover_BorderColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))));--sapUiFieldHoverHelpBackground:var(--sapField_Hover_HelpBackground,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))));--sapUiListHighlightColor:var(--sapList_HighlightColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))));--_ui5_tc_headerItemIcon_border:1px solid var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))));--_ui5_tc_headerItemIcon_color:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))));--_ui5_tc_headerItemIcon_selected_background:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))));--_ui5_tc_overflowItem_default_color:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))));--_ui5_tc_header_border_bottom:0.125rem solid var(--sapUiObjectHeaderBackground,var(--sapObjectHeader_Background,var(--sapBaseColor,var(--sapPrimary3,#eff4f9))));--sapUiButtonRejectHoverBorderColor:var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00))));--sapUiButtonRejectActiveBorderColor:var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00))));--_ui5_button_negative_focus_border_color:var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00))));--sapUiButtonAcceptHoverBorderColor:var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b))));--sapUiButtonAcceptActiveBorderColor:var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b))));--_ui5_button_positive_border_color:var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b))));--_ui5_button_positive_focus_border_color:var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b))));--_ui5_checkbox_hover_background:var(--sapUiFieldHoverBackground,var(--sapField_Hover_Background,var(--sapField_Background,var(--sapPrimary4,#fff))));--_ui5_radiobutton_hover_fill:var(--sapUiFieldHoverBackground,var(--sapField_Hover_Background,var(--sapField_Background,var(--sapPrimary4,#fff))));--sapUiFieldFocusHelpBackground:var(--sapField_Focus_HelpBackground,var(--sapField_Focus_Background,var(--sapField_Background,var(--sapPrimary4,#fff))));--ui5-group-header-listitem-background-color:var(--sapUiListGroupHeaderBackground,var(--sapUiListBackground,var(--sapList_Background,var(--sapPrimary4,#fff))));--_ui5_checkbox_checkmark_color:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))));--_ui5_radiobutton_selected_fill:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))));--_ui5_tc_headerItemContent_border_bottom:0.125rem solid var(--sapUiSelected,var(--sapSelectedColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))));--sapUiButtonActiveBackground:var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))));--sapUiFieldActiveBackground:var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))));--sapUiFieldActiveBorderColor:var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))));--sapUiListActiveBackground:var(--sapUiListHighlightColor,var(--sapList_HighlightColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))));--_ui5_button_negative_active_border_color:var(--sapUiButtonRejectActiveBorderColor,var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00)))));--_ui5_button_positive_border_hover_color:var(--sapUiButtonAcceptHoverBorderColor,var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b)))));--_ui5_button_positive_border_active_color:var(--sapUiButtonAcceptActiveBorderColor,var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#2b7c2b)))));--sapUiButtonActiveBorderColor:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))))));--sapUiButtonEmphasizedActiveBackground:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))))));--sapUiButtonLiteActiveBackground:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))))));--sapUiSegmentedButtonActiveBackground:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))))));--sapUiInfobarActiveBackground:var(--sapUiListActiveBackground,var(--sapUiListHighlightColor,var(--sapList_HighlightColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac))))));--sapUiButtonEmphasizedActiveBorderColor:var(--sapUiButtonActiveBorderColor,var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))))));--_ui5_button_active_border_color:var(--sapUiButtonActiveBorderColor,var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))))));--sapUiButtonLiteActiveBorderColor:var(--sapUiButtonLiteActiveBackground,var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapPrimary2,#427cac)))))));--sapErrorBackground:#ffe4e4;--sapWarningBackground:#fef0db;--sapSuccessBackground:#e4f5e4;--sapInformationBackground:#ebf2f7;--sapNeutralBackground:#f4f5f6;--sapErrorColor:#e00;--sapWarningColor:#f9a429;--sapSuccessColor:#38a238;--sapContent_ImagePlaceholderForegroundColor:#fff;--sapContent_LabelColor:#666;--sapContent_ForegroundColor:#e5e5e5;--sapContent_DisabledTextColor:#333;--sapButton_Background:#f7f7f7;--sapField_ReadOnly_BorderColor:#ccc;--sapGroup_TitleBorderColor:#ccc;--sapGroup_ContentBackground:#fff;--sapShell_TextColor:#346187;--sapShell_BackgroundPatternColor:hsla(0,0%,100%,0.08);--sapScrollBar_FaceColor:#b2b2b2;--sapContent_NonInteractiveIconColor:#878787;--sapContent_MarkerTextColor:#147575;--sapContent_ImagePlaceholderBackground:#ceddec;--sapList_BorderColor:#e5e5e5;--sapList_HeaderBackground:#f7f7f7;--sapInfobar_Background:#168282;--sapToolbar_SeparatorColor:rgba(63,81,97,0.2);--sapUiLinkInverted:#7ed0ff;--sapUiNotificationBarBG:rgba(51,51,51,0.98);--sapUiNotifierSeparator:#000;--sapUiNotificationBarBorder:#666;--sapUiFieldPlaceholderTextColor:#757575;--sapUiDragAndDropActiveBackground:rgba(0,112,177,0.05);--sapUiContentShadowColorFade15:rgba(0,0,0,0.15);--sapUiLinkDarken15:#004065;--sapUiShellBorderColorLighten30:rgba(NaN,NaN,NaN,0.054901960784313725);--sapBackgroundColorFade72:hsla(0,0%,98%,0.72);--sapUiAccent1Lighten50:#fff6e0;--sapUiAccent2Lighten40:#fcd9c3;--sapUiAccent3Lighten46:#fcf6f6;--sapUiAccent4Lighten46:#f3c3e9;--sapUiAccent5Lighten32:#dee6f3;--sapUiAccent6Lighten52:#dbf4ff;--sapUiAccent7Lighten64:#fafefe;--sapUiAccent8Lighten61:#f9fcf0;--sapUiAccent9Lighten37:#f2ebf9;--sapUiAccent10Lighten49:#f1f3f4;--sapContent_IconColor:#346187;--sapUiShellHoverBackground:#346187;--sapUiShellActiveBackground:#2a4f6d;--sapUiShellActiveTextColor:#fff;--sapUiShellHoverToggleBackground:#152736;--sapPageHeader_BorderColor:#d1e0ee;--sapUiListFooterBackground:#ceddec;--sapUiListTableGroupHeaderBackground:#f2f2f2;--sapUiListBackgroundDarken3:#f7f7f7;--sapUiListBackgroundDarken10:#e6e6e6;--sapUiListBackgroundDarken13:#dedede;--sapUiListBackgroundDarken15:#d9d9d9;--sapUiListBackgroundDarken20:#ccc;--sapUiTileBackgroundDarken20:#ccc;--sapUiErrorBG:var(--sapErrorBackground,#ffe4e4);--sapUiWarningBG:var(--sapWarningBackground,#fef0db);--sapUiSuccessBG:var(--sapSuccessBackground,#e4f5e4);--sapUiInformationBG:var(--sapInformationBackground,#ebf2f7);--sapUiNeutralBG:var(--sapNeutralBackground,#f4f5f6);--sapErrorBorderColor:var(--sapErrorColor,#e00);--sapField_InvalidColor:var(--sapErrorColor,#e00);--sapWarningBorderColor:var(--sapWarningColor,#f9a429);--sapField_WarningColor:var(--sapWarningColor,#f9a429);--sapSuccessBorderColor:var(--sapSuccessColor,#38a238);--sapField_SuccessColor:var(--sapSuccessColor,#38a238);--sapUiContentImagePlaceholderForegroundColor:var(--sapContent_ImagePlaceholderForegroundColor,#fff);--sapUiContentLabelColor:var(--sapContent_LabelColor,#666);--sapUiContentForegroundColor:var(--sapContent_ForegroundColor,#e5e5e5);--sapUiContentDisabledTextColor:var(--sapContent_DisabledTextColor,#333);--sapButton_Reject_Background:var(--sapButton_Background,#f7f7f7);--sapButton_Accept_Background:var(--sapButton_Background,#f7f7f7);--sapUiButtonBackground:var(--sapButton_Background,#f7f7f7);--sapUiFieldReadOnlyBorderColor:var(--sapField_ReadOnly_BorderColor,#ccc);--sapUiGroupTitleBorderColor:var(--sapGroup_TitleBorderColor,#ccc);--sapUiGroupContentBackground:var(--sapGroup_ContentBackground,#fff);--sapUiShellTextColor:var(--sapShell_TextColor,#346187);--sapUiShellBackgroundPatternColor:var(--sapShell_BackgroundPatternColor,hsla(0,0%,100%,0.08));--sapScrollBar_BorderColor:var(--sapScrollBar_FaceColor,#b2b2b2);--sapUiScrollBarFaceColor:var(--sapScrollBar_FaceColor,#b2b2b2);--sapUiContentNonInteractiveIconColor:var(--sapContent_NonInteractiveIconColor,#878787);--sapUiContentMarkerTextColor:var(--sapContent_MarkerTextColor,#147575);--sapUiContentImagePlaceholderBackground:var(--sapContent_ImagePlaceholderBackground,#ceddec);--sapList_HeaderBorderColor:var(--sapList_BorderColor,#e5e5e5);--sapUiListBorderColor:var(--sapList_BorderColor,#e5e5e5);--sapUiListHeaderBackground:var(--sapList_HeaderBackground,#f7f7f7);--sapUiInfobarBackground:var(--sapInfobar_Background,#168282);--sapUiToolbarSeparatorColor:var(--sapToolbar_SeparatorColor,rgba(63,81,97,0.2));--_ui5_link_subtle_color:var(--sapUiLinkDarken15,#004065);--ui5-badge-bg-color-scheme-1:var(--sapUiAccent1Lighten50,#fff6e0);--ui5-badge-bg-color-scheme-2:var(--sapUiAccent2Lighten40,#fcd9c3);--ui5-badge-bg-color-scheme-3:var(--sapUiAccent3Lighten46,#fcf6f6);--ui5-badge-bg-color-scheme-4:var(--sapUiAccent4Lighten46,#f3c3e9);--ui5-badge-bg-color-scheme-5:var(--sapUiAccent5Lighten32,#dee6f3);--ui5-badge-bg-color-scheme-6:var(--sapUiAccent6Lighten52,#dbf4ff);--ui5-badge-bg-color-scheme-7:var(--sapUiAccent7Lighten64,#fafefe);--ui5-badge-bg-color-scheme-8:var(--sapUiAccent8Lighten61,#f9fcf0);--ui5-badge-bg-color-scheme-9:var(--sapUiAccent9Lighten37,#f2ebf9);--ui5-badge-bg-color-scheme-10:var(--sapUiAccent10Lighten49,#f1f3f4);--sapScrollBar_SymbolColor:var(--sapContent_IconColor,#346187);--sapUiContentIconColor:var(--sapContent_IconColor,#346187);--sapUiPageHeaderBorderColor:var(--sapPageHeader_BorderColor,#d1e0ee);--sapUiObjectHeaderBorderColor:#d1e0ee;--sapUiButtonRejectActiveBackgroundDarken5:#a20000;--sapUiButtonRejectActiveBackgroundLighten5:#d40000;--sapUiButtonAcceptActiveBackgroundDarken5:#246924;--sapUiButtonAcceptActiveBackgroundLighten5:#328f32;--_ui5_daypicker_item_othermonth_hover_background_color:var(--sapUiListBackgroundDarken10,#e6e6e6);--_ui5_card_border_color:var(--sapUiTileBackgroundDarken20,#ccc);--_ui5_switch_track_disabled_semantic_bg:var(--sapUiErrorBG,var(--sapErrorBackground,#ffe4e4));--_ui5_switch_handle_semantic_hover_bg:var(--sapUiErrorBG,var(--sapErrorBackground,#ffe4e4));--_ui5_switch_track_disabled_semantic_checked_bg:var(--sapUiSuccessBG,var(--sapSuccessBackground,#e4f5e4));--_ui5_switch_handle_semantic_checked_hover_bg:var(--sapUiSuccessBG,var(--sapSuccessBackground,#e4f5e4));--sapUiErrorBorder:var(--sapErrorBorderColor,var(--sapErrorColor,#e00));--sapUiFieldInvalidColor:var(--sapField_InvalidColor,var(--sapErrorColor,#e00));--sapUiWarningBorder:var(--sapWarningBorderColor,var(--sapWarningColor,#f9a429));--sapUiFieldWarningColor:var(--sapField_WarningColor,var(--sapWarningColor,#f9a429));--sapUiSuccessBorder:var(--sapSuccessBorderColor,var(--sapSuccessColor,#38a238));--sapUiFieldSuccessColor:var(--sapField_SuccessColor,var(--sapSuccessColor,#38a238));--_ui5_daypicker_item_othermonth_color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,#666));--_ui5_daypicker_item_othermonth_hover_color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,#666));--_ui5_daypicker_dayname_color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,#666));--_ui5_daypicker_weekname_color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,#666));--_ui5_input_disabled_color:var(--sapUiContentDisabledTextColor,var(--sapContent_DisabledTextColor,#333));--sapUiButtonRejectBackground:var(--sapButton_Reject_Background,var(--sapButton_Background,#f7f7f7));--sapUiButtonAcceptBackground:var(--sapButton_Accept_Background,var(--sapButton_Background,#f7f7f7));--_ui5_token_background:var(--sapUiButtonBackground,var(--sapButton_Background,#f7f7f7));--_ui5_checkbox_inner_readonly_border:0.125rem solid var(--sapUiFieldReadOnlyBorderColor,var(--sapField_ReadOnly_BorderColor,#ccc));--ui5-panel-bottom-border-color:var(--sapUiGroupTitleBorderColor,var(--sapGroup_TitleBorderColor,#ccc));--sapUiDragAndDropBackground:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,#fff));--ui5-panel-background-color:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,#fff));--_ui5_tc_headerItemIcon_selected_color:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,#fff));--_ui5_tc_headerItemIcon_semantic_selected_color:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,#fff));--sapUiScrollBarBorderColor:var(--sapScrollBar_BorderColor,var(--sapScrollBar_FaceColor,#b2b2b2));--sapUiDragAndDropColor:var(--sapUiContentNonInteractiveIconColor,var(--sapContent_NonInteractiveIconColor,#878787));--sapUiListHeaderBorderColor:var(--sapList_HeaderBorderColor,var(--sapList_BorderColor,#e5e5e5));--sapUiButtonActionSelectBorderColor:var(--sapUiListBorderColor,var(--sapList_BorderColor,#e5e5e5));--ui5-listitem-border-bottom:1px solid var(--sapUiListBorderColor,var(--sapList_BorderColor,#e5e5e5));--sapUiShadowText:0 0 0.125rem #fff;--sapUiToggleButtonPressedBackground:#346187;--sapUiSelectedDarken10:#346187;--sapUiActiveLighten3:#4684b7;--sapUiScrollBarSymbolColor:var(--sapScrollBar_SymbolColor,var(--sapContent_IconColor,#346187));--_ui5_token_icon_color:var(--sapUiContentIconColor,var(--sapContent_IconColor,#346187));--_ui5_tc_header_box_shadow:inset 0 -0.25rem 0 -0.125rem var(--sapUiObjectHeaderBorderColor,#d1e0ee);--_ui5_tc_content_border_bottom:0.125rem solid var(--sapUiObjectHeaderBorderColor,#d1e0ee);--_ui5_toggle_button_pressed_negative_hover:var(--sapUiButtonRejectActiveBackgroundDarken5,#a20000);--_ui5_toggle_button_pressed_positive_hover:var(--sapUiButtonAcceptActiveBackgroundDarken5,#246924);--_ui5_card_header_border_color:var(--_ui5_card_border_color,var(--sapUiTileBackgroundDarken20,#ccc));--_ui5_switch_track_disabled_semantic_border_color:var(--sapUiErrorBorder,var(--sapErrorBorderColor,var(--sapErrorColor,#e00)));--_ui5_switch_handle_semantic_hover_border_color:var(--sapUiErrorBorder,var(--sapErrorBorderColor,var(--sapErrorColor,#e00)));--_ui5_switch_handle_disabled_semantic_border_color:var(--sapUiErrorBorder,var(--sapErrorBorderColor,var(--sapErrorColor,#e00)));--_ui5_checkbox_inner_error_border:0.125rem solid var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorColor,#e00)));--_ui5_radiobutton_selected_error_fill:var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorColor,#e00)));--_ui5_checkbox_inner_warning_border:0.125rem solid var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapWarningColor,#f9a429)));--_ui5_switch_track_disabled_semantic_checked_border_color:var(--sapUiSuccessBorder,var(--sapSuccessBorderColor,var(--sapSuccessColor,#38a238)));--_ui5_switch_handle_semantic_checked_hover_border_color:var(--sapUiSuccessBorder,var(--sapSuccessBorderColor,var(--sapSuccessColor,#38a238)));--_ui5_switch_handle_disabled_semantic_checked_border_color:var(--sapUiSuccessBorder,var(--sapSuccessBorderColor,var(--sapSuccessColor,#38a238)));--sapUiSegmentedButtonSelectedBackground:var(--sapUiToggleButtonPressedBackground,#346187);--_ui5_switch_handle_checked_bg:var(--sapUiToggleButtonPressedBackground,#346187);--_ui5_daypicker_item_selected_background_color:var(--sapUiSelectedDarken10,#346187);--_ui5_daypicker_item_selected_hover_background_color:var(--sapUiSelectedDarken10,#346187);--_ui5_monthpicker_item_selected_hover:var(--sapUiSelectedDarken10,#346187);--_ui5_monthpicker_item_selected_focus:var(--sapUiSelectedDarken10,#346187);--_ui5_yearpicker_item_selected_focus:var(--sapUiSelectedDarken10,#346187);--sapShell_Background:#cad8e6;--sapField_ReadOnly_Background:hsla(0,0%,94.9%,0.5);--_ui5_switch_handle_disabled_checked_bg:var(--_ui5_switch_handle_checked_bg,var(--sapUiToggleButtonPressedBackground,#346187));--sapButton_Emphasized_Background:#5496cd;--sapUiShellBackground:var(--sapShell_Background,#cad8e6);--sapField_ReadOnly_HelpBackground:var(--sapField_ReadOnly_Background,hsla(0,0%,94.9%,0.5));--sapUiFieldReadOnlyBackground:var(--sapField_ReadOnly_Background,hsla(0,0%,94.9%,0.5));--sapList_SelectionBackgroundColor:#e8f0f6;--sapUiButtonEmphasizedBackground:var(--sapButton_Emphasized_Background,#5496cd);--sapButton_BorderColor:#ababab;--sapButton_Hover_Background:#eaeaea;--sapGroup_ContentBorderColor:#ebebeb;--sapScrollBar_TrackColor:#fff;--sapScrollBar_Hover_FaceColor:#aaa;--sapUiFieldReadOnlyHelpBackground:var(--sapField_ReadOnly_HelpBackground,var(--sapField_ReadOnly_Background,hsla(0,0%,94.9%,0.5)));--sapUiListSelectionBackgroundColor:var(--sapList_SelectionBackgroundColor,#e8f0f6);--sapUiErrorBGLighten4:#fff8f8;--sapUiSuccessBGLighten5:#f7fcf7;--sapUiContentForegroundColorLighten5:#f2f2f2;--sapUiContentForegroundColorLighten7:#f7f7f7;--sapUiContentForegroundColorDarken3:#ddd;--sapUiContentForegroundColorDarken5:#d8d8d8;--sapUiContentForegroundColorDarken10:#ccc;--sapUiSegmentedButtonBackground:#fff;--sapUiButtonBackgroundDarken7:#e5e5e5;--sapUiButtonBackgroundDarken2:#f2f2f2;--sapUiButtonBackgroundDarken10:#dedede;--sapButton_Hover_BorderColor:var(--sapButton_BorderColor,#ababab);--sapUiButtonBorderColor:var(--sapButton_BorderColor,#ababab);--sapUiButtonHoverBackground:var(--sapButton_Hover_Background,#eaeaea);--sapUiGroupContentBorderColor:var(--sapGroup_ContentBorderColor,#ebebeb);--sapUiScrollBarTrackColor:var(--sapScrollBar_TrackColor,#fff);--sapUiScrollBarHoverFaceColor:var(--sapScrollBar_Hover_FaceColor,#aaa);--sapUiListVerticalBorderColor:#ddd;--sapUiListTableGroupHeaderBorderColor:#ccc;--sapUiListTableFooterBorder:#ccc;--sapUiListTableFixedBorder:#999;--sapUiListBorderColorLighten10:#fff;--sapUiInfobarHoverBackground:#147575;--_ui5_switch_handle_disabled_semantic_bg:var(--sapUiErrorBGLighten4,#fff8f8);--_ui5_switch_handle_disabled_semantic_checked_bg:var(--sapUiSuccessBGLighten5,#f7fcf7);--sapUiFieldWarningColorDarken100:#000;--_ui5_daypicker_item_background_color:var(--sapUiContentForegroundColorLighten5,#f2f2f2);--_ui5_monthpicker_item_background_color:var(--sapUiContentForegroundColorLighten7,#f7f7f7);--_ui5_monthpicker_item_hover_background_color:var(--sapUiContentForegroundColorLighten7,#f7f7f7);--_ui5_yearpicker_item_background_color:var(--sapUiContentForegroundColorLighten7,#f7f7f7);--_ui5_yearpicker_item_hover_background_color:var(--sapUiContentForegroundColorLighten7,#f7f7f7);--_ui5_daypicker_item_weekend_background_color:var(--sapUiContentForegroundColorDarken3,#ddd);--_ui5_daypicker_item_hover_background_color:var(--sapUiContentForegroundColorDarken5,#d8d8d8);--_ui5_monthpicker_item_focus_background_color:var(--sapUiContentForegroundColorDarken5,#d8d8d8);--_ui5_yearpicker_item_focus_background_color:var(--sapUiContentForegroundColorDarken5,#d8d8d8);--_ui5_daypicker_item_weekend_hover_background_color:var(--sapUiContentForegroundColorDarken10,#ccc);--_ui5_switch_track_bg:var(--sapUiButtonBackgroundDarken7,#e5e5e5);--_ui5_switch_track_hover_bg:var(--sapUiButtonBackgroundDarken7,#e5e5e5);--_ui5_switch_handle_bg:var(--sapUiButtonBackgroundDarken2,#f2f2f2);--_ui5_token_border_color:var(--sapUiButtonBackgroundDarken10,#dedede);--sapUiButtonHoverBorderColor:var(--sapButton_Hover_BorderColor,var(--sapButton_BorderColor,#ababab));--_ui5_button_focussed_border_color:var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,#ababab));--sapUiButtonAcceptHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#eaeaea));--sapUiButtonRejectHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#eaeaea));--sapUiSegmentedButtonHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#eaeaea));--sapUiSegmentedButtonFooterHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#eaeaea));--_ui5_daypicker_item_now_selected_text_border_color:var(--sapUiListBorderColorLighten10,#fff);--sapUiShadowLevel0:0 0 0 1px rgba(0,0,0,0.15);--sapUiToggleButtonPressedBorderColor:#2d5475;--sapUiToggleButtonPressedHoverBackground:#427bac;--_ui5_checkbox_checkmark_warning_color:var(--sapUiFieldWarningColorDarken100,#000);--_ui5_radiobutton_selected_warning_fill:var(--sapUiFieldWarningColorDarken100,#000);--_ui5_switch_track_disabled_bg:var(--_ui5_switch_track_bg,var(--sapUiButtonBackgroundDarken7,#e5e5e5));--_ui5_switch_handle_disabled_bg:var(--_ui5_switch_handle_bg,var(--sapUiButtonBackgroundDarken2,#f2f2f2));--_ui5_switch_handle_checked_border_color:var(--sapUiToggleButtonPressedBorderColor,#2d5475);--_ui5_toggle_button_pressed_focussed:var(--sapUiToggleButtonPressedBorderColor,#2d5475);--_ui5_toggle_button_pressed_focussed_hovered:var(--sapUiToggleButtonPressedBorderColor,#2d5475);--sapUiToggleButtonPressedHoverBorderColor:var(--sapUiToggleButtonPressedHoverBackground,#427bac);--sapUiSegmentedButtonSelectedHoverBackground:var(--sapUiToggleButtonPressedHoverBackground,#427bac);--_ui5_switch_handle_checked_hover_bg:var(--sapUiToggleButtonPressedHoverBackground,#427bac);--sapUiShadowHeader:0 0.125rem 0 0 #eff4f9,inset 0 -0.125rem 0 0 #d1e0ee;--sapList_Hover_Background:#f0f0f0;--sapUiSegmentedButtonSelectedHoverBorderColor:var(--sapUiToggleButtonPressedHoverBorderColor,var(--sapUiToggleButtonPressedHoverBackground,#427bac));--sapButton_Emphasized_BorderColor:#408ac7;--sapUiPageFooterBorderColor:#ebebeb;--sapUiShellGroupTextColor:#343434;--sapUiShellContainerBackground:#fff;--sapUiListHoverBackground:var(--sapList_Hover_Background,#f0f0f0);--sapUiButtonEmphasizedHoverBackground:#408ac7;--sapUiButtonEmphasizedHoverBorderColor:#408ac7;--sapUiButtonEmphasizedBorderColor:var(--sapButton_Emphasized_BorderColor,#408ac7);--sapUiButtonLiteActionSelectHoverBackground:var(--sapUiListHoverBackground,var(--sapList_Hover_Background,#f0f0f0));--sapUiToggleButtonPressedBackgroundLighten50Desaturate47:#dedede;--_ui5_button_emphasized_focused_border_color:var(--sapUiButtonEmphasizedBorderColor,var(--sapButton_Emphasized_BorderColor,#408ac7));--sapUiSegmentedButtonBorderColor:#bfbfbf;--sapUiSegmentedButtonFooterBorderColor:#bfbfbf;--sapUiButtonHoverBackgroundDarken2:#e5e5e5;--sapUiButtonHoverBackgroundDarken5:#ddd;--_ui5_switch_track_checked_bg:var(--sapUiToggleButtonPressedBackgroundLighten50Desaturate47,#dedede);--_ui5_switch_track_hover_checked_bg:var(--sapUiToggleButtonPressedBackgroundLighten50Desaturate47,#dedede);--_ui5_switch_handle_hover_bg:var(--sapUiButtonHoverBackgroundDarken2,#e5e5e5);--_ui5_token_hover_border_color:var(--sapUiButtonHoverBackgroundDarken5,#ddd);--_ui5_switch_track_disabled_checked_bg:var(--_ui5_switch_track_checked_bg,var(--sapUiToggleButtonPressedBackgroundLighten50Desaturate47,#dedede));--sapGroup_TitleTextColor:#333;--sapUiShellAltContainerBackground:#6391be;--sapTile_TitleTextColor:#333;--sapPageFooter_TextColor:#333;--sapHighlightTextColor:#fff;--sapPageHeader_TextColor:#666;--sapUiGroupTitleTextColor:var(--sapGroup_TitleTextColor,#333);--sapUiTileTitleTextColor:var(--sapTile_TitleTextColor,#333);--sapUiPageFooterTextColor:var(--sapPageFooter_TextColor,#333);--sapUiShadowLevel1:0 0.125rem 0.5rem 0 rgba(0,0,0,0.15),0 0 0 1px rgba(0,0,0,0.15);--sapUiShadowLevel2:0 0.625rem 1.875rem 0 rgba(0,0,0,0.15),0 0 0 1px rgba(0,0,0,0.15);--sapUiShadowLevel3:0 1.25rem 5rem 0 rgba(0,0,0,0.15),0 0 0 1px rgba(0,0,0,0.15);--sapUiHighlightTextColor:var(--sapHighlightTextColor,#fff);--sapUiPageHeaderTextColor:var(--sapPageHeader_TextColor,#666);--sapUiButtonLiteHoverBackground:hsla(0,0%,69.8%,0.5);--_ui5_tc_headerItem_color:var(--sapUiGroupTitleTextColor,var(--sapGroup_TitleTextColor,#333));--sapUiListFooterTextColor:var(--sapUiPageFooterTextColor,var(--sapPageFooter_TextColor,#333));--sapUiButtonLiteHoverBorderColor:var(--sapUiButtonLiteHoverBackground,hsla(0,0%,69.8%,0.5));--sapUiButtonFooterHoverBackground:var(--sapUiButtonLiteHoverBackground,hsla(0,0%,69.8%,0.5));--sapUiToggleButtonPressedBorderColorLighten19Desaturate46:#818181;--sapUiListActiveTextColor:#fff;--_ui5_switch_track_checked_border_color:var(--sapUiToggleButtonPressedBorderColorLighten19Desaturate46,#818181);--sapUiSegmentedButtonActiveIconColor:#fff;--_ui5_switch_track_hover_border_color:var(--_ui5_switch_track_checked_border_color,var(--sapUiToggleButtonPressedBorderColorLighten19Desaturate46,#818181));--sapTile_IconColor:#93b7d5;--sapContent_ForegroundTextColor:#333;--sapButton_TextColor:#346187;--sapList_HeaderTextColor:#333;--sapUiTileIconColor:var(--sapTile_IconColor,#93b7d5);--sapUiListTableGroupHeaderTextColor:#147575;--sapUiContentForegroundTextColor:var(--sapContent_ForegroundTextColor,#333);--sapUiButtonIconColor:#346187;--sapUiButtonTextColor:var(--sapButton_TextColor,#346187);--sapUiListHeaderTextColor:var(--sapList_HeaderTextColor,#333);--sapUiListSelectionHoverBackground:#dde9f2;--sapUiButtonRejectTextColor:#b00;--sapUiButtonAcceptTextColor:#2b7c2b;--sapUiButtonLiteTextColor:var(--sapUiButtonTextColor,var(--sapButton_TextColor,#346187));--sapUiButtonHeaderTextColor:var(--sapUiButtonTextColor,var(--sapButton_TextColor,#346187));--_ui5_token_text_color:var(--sapUiButtonTextColor,var(--sapButton_TextColor,#346187));--sapUiButtonHeaderDisabledTextColor:var(--sapUiButtonHeaderTextColor,var(--sapUiButtonTextColor,var(--sapButton_TextColor,#346187)));--sapUiSegmentedButtonSelectedIconColor:#fff;--sapButton_Emphasized_TextColor:#fff;--sapUiButtonEmphasizedTextColor:var(--sapButton_Emphasized_TextColor,#fff);--sapButton_Hover_TextColor:#346187;--sapUiSegmentedButtonIconColor:#346187;--sapUiButtonHoverTextColor:var(--sapButton_Hover_TextColor,#346187);--sapTile_TextColor:#666;--sapUiTileTextColor:var(--sapTile_TextColor,#666);--sapUiButtonFooterTextColor:#346187;--sapUiButtonActiveTextColor:#fff;--sapUiToggleButtonPressedTextColor:#fff;--sapUiSegmentedButtonTextColor:#346187;--sapUiSegmentedButtonSelectedTextColor:var(--sapUiToggleButtonPressedTextColor,#fff);--sapUiButtonEmphasizedTextShadow:#000;--sapUiSegmentedButtonActiveTextColor:#fff}";

var belizeHcbThemeProperties = ":root{--sapFontFamily:\"72\",\"72full\",Arial,Helvetica,sans-serif;--sapFontSize:calc(0.875*var(--sapContent_GridSize));--sapCompanyLogo:none;--sapBackgroundImage:none;--sapBackgroundImageOpacity:1.0;--sapBackgroundImageRepeat:false;--sapContent_GridSize:1rem;--sapHC_StandardBackground:#000;--sapHC_HighlightBackground:#7a5100;--sapHC_HighlightAltBackground:#0f5d94;--sapHC_ReducedBackground:#585858;--sapHC_ReducedAltBackground:#a2a39f;--sapHC_StandardForeground:#fff;--sapHC_EnhancedForeground:#03b803;--sapHC_ReducedForeground:#666;--sapHC_ReducedAltForeground:#999;--sapHC_NegativeColor:#ff5e5e;--sapHC_CriticalColor:#ffab1d;--sapHC_PositiveColor:#9c9;--sapHC_InformativeColor:#7a5100;--sapHC_NeutralColor:#fff;--sapAccentColor1:#ffc847;--sapAccentColor2:#ed884a;--sapAccentColor3:#db9292;--sapAccentColor4:#e269c9;--sapAccentColor5:#8ca7d5;--sapAccentColor6:#6bd3ff;--sapAccentColor7:#7fc6c6;--sapAccentColor8:#b2e484;--sapAccentColor9:#b995e0;--sapAccentColor10:#b0bcc5;--sapIndicationColor_1:#ff5e5e;--sapIndicationColor_2:#ff9191;--sapIndicationColor_3:#ffab1d;--sapIndicationColor_4:#9c9;--sapIndicationColor_5:#0f5d94;--sapElement_LineHeight:calc(3*var(--sapContent_GridSize, 1rem));--sapElement_Height:calc(2.5*var(--sapContent_GridSize, 1rem));--sapElement_BorderWidth:calc(0.0625*var(--sapContent_GridSize, 1rem));--sapContent_LineHeight:1.4;--sapContent_ElementHeight:1.37em;--sapContent_ElementHeight_PX:22px;--sapContent_MonospaceFontFamily:lucida console,monospace;--sapContent_DisabledOpacity:0.5;--sapContent_ContrastTextThreshold:0.65;--sapShell_BackgroundImageOpacity:1.0;--sapShell_BackgroundImageRepeat:false;--sapShell_Favicon:none;--sapButton_BorderCornerRadius:calc(0.2*var(--sapContent_GridSize, 1rem));--sapField_BorderCornerRadius:0;--sapGroup_BorderCornerRadius:0;--sapScrollBar_Dimension:calc(0.7*var(--sapContent_GridSize, 1rem));--sapUiFontSize:16px;--sapUiFontCondensedFamily:\"Arial Narrow\",HelveticaNeue-CondensedBold,Arial,sans-serif;--sapUiFontHeaderWeight:normal;--sapMFontHeader1Size:1.625rem;--sapMFontHeader2Size:1.375rem;--sapMFontHeader3Size:1.250rem;--sapMFontHeader4Size:1.125rem;--sapMFontHeader5Size:1rem;--sapMFontHeader6Size:0.875rem;--sapMFontSmallSize:0.75rem;--sapMFontMediumSize:0.875rem;--sapMFontLargeSize:1rem;--sapUiTranslucentBGOpacity:100%;--sapUiDesktopFontSize:12px;--sapUiFontLargeSize:13px;--sapUiFontSmallSize:11px;--sapUiFontHeader1Size:26px;--sapUiFontHeader2Size:20px;--sapUiFontHeader3Size:18px;--sapUiFontHeader4Size:16px;--sapUiFontHeader5Size:14px;--sapUiLineHeight:18px;--sapUiNotifierSeparatorWidth:1px;--sapUiButtonEmphasizedTextShadow:none;--sapUiListTableTextSize:0.875rem;--sapUiListTableIconSize:1rem;--sapUiShadowText:none;--_ui5_button_base_min_width:2.5rem;--_ui5_button_base_min_compact_width:2rem;--_ui5_button_base_height:2.5rem;--_ui5_button_compact_height:1.625rem;--_ui5_button_base_padding:0 0.6875rem 0 0.6875rem;--_ui5_button_compact_padding:0 0.4375rem;--_ui5_button_base_icon_only_padding:0 0.5625rem;--_ui5_button_base_icon_margin:0.563rem;--_ui5_button_base_icon_only_font_size:1.375rem;--_ui5_button_emphasized_font_weight:normal;--_ui5_button_border_radius:0.375rem;--_ui5_button_focus_after_bottom:-1px;--_ui5_button_focus_after_right:-1px;--_ui5_button_focus_after_left:-1px;--_ui5_button_focus_after_top:-1px;--_ui5_button_focussed_border_color:transparent;--_ui5_button_positive_border_active_color:transparent;--_ui5_button_active_border_color:transparent;--_ui5_button_positive_focus_border_color:transparent;--_ui5_button_negative_focus_border_color:transparent;--_ui5_button_negative_active_border_color:transparent;--_ui5_calendar_header_middle_button_focus_after_width:calc(100% - 0.25rem);--_ui5_calendar_header_middle_button_focus_after_height:calc(100% - 0.25rem);--_ui5_calendar_header_middle_button_focus_after_top_offset:1px;--_ui5_calendar_header_middle_button_focus_after_left_offset:1px;--_ui5_calendar_header_arrow_button_border_radius:0.375rem;--_ui5_calendar_header_middle_button_width:5.75rem;--_ui5_calendar_header_middle_button_flex:auto;--_ui5_calendar_header_middle_button_focus_border_radius:0;--_ui5_calendar_header_middle_button_focus_after_display:none;--_ui5_card_content_padding:1rem;--_ui5_checkbox_wrapper_padding:.8125rem;--_ui5_checkbox_width_height:3rem;--_ui5_checkbox_inner_width_height:1.375rem;--_ui5_checkbox_wrapped_focus_padding:.375rem;--_ui5_checkbox_wrapped_content_margin_top:.125rem;--_ui5_checkbox_wrapped_focus_left_top_bottom_position:.5625rem;--_ui5_checkbox_focus_position:.6875rem;--_ui5_checkbox_compact_wrapper_padding:.5rem;--_ui5_checkbox_compact_width_height:2rem;--_ui5_checkbox_compact_inner_size:1rem;--_ui5_checkbox_compact_focus_position:.375rem;--_ui5_checkbox_compact_wrapped_label_margin_top:-1px;--_ui5_checkbox_inner_border_radius:0;--_ui5_datepicker_icon_border:1px solid transparent;--_ui5_daypicker_daynames_container_height:2rem;--_ui5_daypicker_weeknumbers_container_padding_top:2rem;--_ui5_daypicker_item_border_radius:0;--_ui5_daypicker_item_now_inner_border_radius:0;--_ui5_daypicker_item_margin:0;--_ui5_daypicker_item_outline_width:0.125rem;--_ui5_daypicker_item_outline_offset:0;--_ui5_daypicker_item_now_selected_focus_after_width:calc(100% - 0.25rem);--_ui5_daypicker_item_now_selected_focus_after_height:calc(100% - 0.25rem);--_ui5_input_height:2.5rem;--_ui5_input_compact_height:1.625rem;--_ui5_input_wrapper_border_radius:0;--sap_wc_input_disabled_opacity:0.5;--sap_wc_input_icon_min_width:2.375rem;--sap_wc_input_compact_min_width:2rem;--_ui5_input_focus_border_width:0.125rem;--_ui5_input_state_border_width:1px;--_ui5_input_error_warning_border_style:dashed;--_ui5_input_error_warning_font_style:italic;--_ui5_input_error_font_weight:bold;--_ui5_input_disabled_font_weight:normal;--_ui5_link_opacity:0.5;--_ui5_link_outline_element_size:calc(100% - 0.1875rem);--_ui5_listitembase_focus_width:0.125rem;--_ui5_monthpicker_item_border_radius:0;--_ui5_monthpicker_item_margin:0;--_ui5_monthpicker_item_focus_after_width:calc(100% - 0.25rem);--_ui5_monthpicker_item_focus_after_height:calc(100% - 0.25rem);--_ui5_monthpicker_item_focus_after_offset:0;--_ui5_messagestrip_icon_width:2.5rem;--_ui5_messagestrip_border_radius:0.1875rem;--_ui5_messagestrip_button_border_width:0;--_ui5_messagestrip_button_border_style:none;--_ui5_messagestrip_button_border_color:transparent;--_ui5_messagestrip_button_border_radius:0;--_ui5_messagestrip_padding:0.125rem .125rem;--_ui5_messagestrip_button_height:1.625rem;--_ui5_messagestrip_close_button_size:1.5rem;--_ui5_messagestrip_border_width:0.125rem;--_ui5_messagestrip_icon_top:0.375rem;--_ui5_messagestrip_focus_width:0.125rem;--_ui5_popover_content_padding:.4375em;--_ui5_popover_arrow_shadow_color:hsla(0,0%,100%,0.3);--_ui5_radiobutton_border_width:0.125rem;--_ui5_radiobutton_warning_error_border_dash:5;--_ui5_select_state_error_warning_border_style:dashed;--_ui5_select_state_error_warning_border_width:1px;--_ui5_select_rtl_hover_icon_left_border:none;--_ui5_select_focus_width:0.125rem;--_ui5_switch_height:2.75rem;--_ui5_switch_width:3.875rem;--_ui5_switch_no_label_width:3.25rem;--_ui5_switch_compact_height:2rem;--_ui5_switch_compact_width:3.5rem;--_ui5_switch_compact_no_label_width:2.5rem;--_ui5_switch_track_height:1.375rem;--_ui5_switch_track_no_label_height:1.25rem;--_ui5_switch_track_compact_no_label_height:1rem;--_ui5_switch_track_border_radius:0.75rem;--_ui5_switch_handle_width:2rem;--_ui5_switch_handle_height:2rem;--_ui5_switch_handle_border_radius:1rem;--_ui5_switch_handle_compact_width:1.625rem;--_ui5_switch_handle_compact_height:1.625rem;--_ui5_switch_outline:0.125rem;--_ui5_switch_handle_border_width:0.125rem;--_ui5_tc_headerItemSemanticIcon_display:inline-block;--_ui5_textarea_focus_after_width:2px;--_ui5_textarea_warning_border_style:dashed;--_ui5_textarea_warning_border_width:1px;--_ui5_TimelineItem_arrow_size:1.625rem;--_ui5_TimelineItem_bubble_outline_width:0.125rem;--_ui5_TimelineItem_bubble_outline_top:-0.1875rem;--_ui5_TimelineItem_bubble_outline_right:-0.1875rem;--_ui5_TimelineItem_bubble_outline_bottom:-0.1875rem;--_ui5_TimelineItem_bubble_outline_left:-0.6875rem;--_ui5_TimelineItem_bubble_rtl_left_offset:-0.1875rem;--_ui5_TimelineItem_bubble_rtl_right_offset:-0.6875rem;--_ui5_toggle_button_pressed_focussed:transparent;--_ui5_toggle_button_pressed_focussed_hovered:transparent;--_ui5_yearpicker_item_border_radius:0;--_ui5_yearpicker_item_margin:0;--_ui5_yearpicker_item_focus_after_width:calc(100% - 0.25rem);--_ui5_yearpicker_item_focus_after_height:calc(100% - 0.25rem);--_ui5_yearpicker_item_focus_after_offset:0;--_ui5_token_border_radius:0.125rem;--sapBaseColor:var(--sapHC_StandardBackground,#000);--sapShellColor:var(--sapHC_StandardBackground,#000);--sapBackgroundColorDefault:var(--sapHC_StandardBackground,#000);--sapBackgroundColor:var(--sapHC_StandardBackground,#000);--sapBrandColor:var(--sapHC_HighlightBackground,#7a5100);--sapTextColor:var(--sapHC_StandardForeground,#fff);--sapLinkColor:var(--sapHC_StandardForeground,#fff);--sapErrorBackground:var(--sapHC_StandardBackground,#000);--sapWarningBackground:var(--sapHC_StandardBackground,#000);--sapSuccessBackground:var(--sapHC_StandardBackground,#000);--sapInformationBackground:var(--sapHC_StandardBackground,#000);--sapNeutralBackground:var(--sapHC_StandardBackground,#000);--sapNegativeColor:var(--sapHC_NegativeColor,#ff5e5e);--sapCriticalColor:var(--sapHC_CriticalColor,#ffab1d);--sapPositiveColor:var(--sapHC_PositiveColor,#9c9);--sapInformativeColor:var(--sapHC_InformativeColor,#7a5100);--sapNeutralColor:var(--sapHC_NeutralColor,#fff);--sapSelectedColor:var(--sapHC_HighlightAltBackground,#0f5d94);--sapContent_IconHeight:var(--sapContent_GridSize,1rem);--sapContent_IconColor:var(--sapHC_StandardForeground,#fff);--sapContent_ImagePlaceholderForegroundColor:var(--sapHC_ReducedAltForeground,#999);--sapContent_FocusColor:var(--sapHC_StandardForeground,#fff);--sapContent_ShadowColor:var(--sapHC_StandardForeground,#fff);--sapContent_HelpColor:var(--sapHC_EnhancedForeground,#03b803);--sapContent_DisabledTextColor:var(--sapHC_ReducedForeground,#666);--sapContent_ForegroundBorderColor:var(--sapHC_StandardForeground,#fff);--sapShell_BorderColor:var(--sapHC_StandardForeground,#fff);--sapButton_BorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapButton_BorderColor:var(--sapHC_StandardForeground,#fff);--sapField_BorderColor:var(--sapHC_StandardForeground,#fff);--sapField_BorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapField_ReadOnly_Background:var(--sapHC_ReducedBackground,#585858);--sapField_ReadOnly_BorderColor:var(--sapHC_ReducedAltForeground,#999);--sapGroup_TitleBorderColor:var(--sapHC_StandardForeground,#fff);--sapGroup_Title_FontSize:var(--sapFontSize,calc(0.875*var(--sapContent_GridSize)));--sapGroup_ContentBorderColor:var(--sapHC_StandardForeground,#fff);--sapGroup_BorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapToolbar_SeparatorColor:var(--sapHC_StandardForeground,#fff);--sapList_HeaderBorderColor:var(--sapHC_StandardForeground,#fff);--sapList_BorderColor:var(--sapHC_ReducedAltForeground,#999);--sapList_BorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapScrollBar_FaceColor:var(--sapHC_ReducedAltForeground,#999);--sapScrollBar_Hover_FaceColor:var(--sapHC_StandardForeground,#fff);--sapPageHeader_BorderColor:var(--sapHC_StandardForeground,#fff);--sapTile_BorderColor:var(--sapHC_StandardForeground,#fff);--sapUiFontFamily:var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif);--sapUiGlobalLogo:var(--sapCompanyLogo,none);--sapUiGlobalBackgroundImage:var(--sapBackgroundImage,none);--sapUiBackgroundImage:var(--sapBackgroundImage,none);--sapUiUx3ShellBackgroundImageURL:var(--sapBackgroundImage,none);--sapUiGlobalBackgroundImageOpacity:var(--sapBackgroundImageOpacity,1.0);--sapUiGlobalBackgroundRepeat:var(--sapBackgroundImageRepeat,false);--sapUiElementLineHeight:var(--sapElement_LineHeight,calc(3*var(--sapContent_GridSize, 1rem)));--sapUiElementHeight:var(--sapElement_Height,calc(2.5*var(--sapContent_GridSize, 1rem)));--sapUiElementBorderWidth:var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem)));--sapUiContentLineHeight:var(--sapContent_LineHeight,1.4);--sapUiContentElementHeight:var(--sapContent_ElementHeight,1.37em);--sapUiContentElementHeightPX:var(--sapContent_ElementHeight_PX,22px);--sapUiContentDisabledOpacity:var(--sapContent_DisabledOpacity,0.5);--sapUiContentContrastTextThreshold:var(--sapContent_ContrastTextThreshold,0.65);--sapUiShellBackgroundImageOpacity:var(--sapShell_BackgroundImageOpacity,1.0);--sapUiShellBackgroundImageRepeat:var(--sapShell_BackgroundImageRepeat,false);--sapUiShellFavicon:var(--sapShell_Favicon,none);--sapUiButtonBorderCornerRadius:var(--sapButton_BorderCornerRadius,calc(0.2*var(--sapContent_GridSize, 1rem)));--sapUiFieldBorderCornerRadius:var(--sapField_BorderCornerRadius,0);--sapUiScrollBarDimension:var(--sapScrollBar_Dimension,calc(0.7*var(--sapContent_GridSize, 1rem)));--sapUiContentGridSize:var(--sapContent_GridSize,1rem);--sapUiHcStandardBackground:var(--sapHC_StandardBackground,#000);--sapUiHcHighlightBackground:var(--sapHC_HighlightBackground,#7a5100);--sapUiHcHighlightAltBackground:var(--sapHC_HighlightAltBackground,#0f5d94);--sapUiHcReducedBackground:var(--sapHC_ReducedBackground,#585858);--sapUiHcReducedAltBackground:var(--sapHC_ReducedAltBackground,#a2a39f);--sapUiHcStandardForeground:var(--sapHC_StandardForeground,#fff);--sapUiHcEnhancedForeground:var(--sapHC_EnhancedForeground,#03b803);--sapUiHcReducedForeground:var(--sapHC_ReducedForeground,#666);--sapUiHcReducedAltForeground:var(--sapHC_ReducedAltForeground,#999);--sapUiHcNegativeColor:var(--sapHC_NegativeColor,#ff5e5e);--sapUiHcCriticalColor:var(--sapHC_CriticalColor,#ffab1d);--sapUiHcPositiveColor:var(--sapHC_PositiveColor,#9c9);--sapUiHcInformativeColor:var(--sapHC_InformativeColor,#7a5100);--sapUiHcNeutralColor:var(--sapHC_NeutralColor,#fff);--sapUiAccent1:var(--sapAccentColor1,#ffc847);--sapUiAccent2:var(--sapAccentColor2,#ed884a);--sapUiAccent3:var(--sapAccentColor3,#db9292);--sapUiAccent4:var(--sapAccentColor4,#e269c9);--sapUiAccent5:var(--sapAccentColor5,#8ca7d5);--sapUiAccent6:var(--sapAccentColor6,#6bd3ff);--sapUiAccent7:var(--sapAccentColor7,#7fc6c6);--sapUiAccent8:var(--sapAccentColor8,#b2e484);--sapUiAccent9:var(--sapAccentColor9,#b995e0);--sapUiAccent10:var(--sapAccentColor10,#b0bcc5);--sapUiIndication1:var(--sapIndicationColor_1,#ff5e5e);--sapUiIndication2:var(--sapIndicationColor_2,#ff9191);--sapUiIndication3:var(--sapIndicationColor_3,#ffab1d);--sapUiIndication4:var(--sapIndicationColor_4,#9c9);--sapUiIndication5:var(--sapIndicationColor_5,#0f5d94);--sapUiFontHeader6Size:var(--sapUiFontLargeSize,13px);--sapPageHeader_Background:var(--sapBaseColor,var(--sapHC_StandardBackground,#000));--sapObjectHeader_Background:var(--sapBaseColor,var(--sapHC_StandardBackground,#000));--sapUiBaseColor:var(--sapBaseColor,var(--sapHC_StandardBackground,#000));--sapUiShellColor:var(--sapShellColor,var(--sapHC_StandardBackground,#000));--sapContent_ImagePlaceholderBackground:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapContent_ForegroundColor:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapShell_Background:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapShell_BackgroundImage:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapShell_BackgroundPatternColor:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapShell_BackgroundGradient:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapButton_Background:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapField_Background:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapGroup_TitleBackground:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapGroup_ContentBackground:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapGroup_FooterBackground:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapToolbar_Background:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapList_HeaderBackground:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapList_Background:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapScrollBar_TrackColor:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapPageFooter_Background:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapInfobar_Background:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapBlockLayer_Background:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapTile_Background:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapUiBaseBG:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapUiGlobalBackgroundColor:var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000));--sapHighlightColor:var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100));--sapUiBrand:var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100));--sapTitleColor:var(--sapTextColor,var(--sapHC_StandardForeground,#fff));--sapContent_MarkerTextColor:var(--sapTextColor,var(--sapHC_StandardForeground,#fff));--sapContent_LabelColor:var(--sapTextColor,var(--sapHC_StandardForeground,#fff));--sapContent_ContrastTextColor:var(--sapTextColor,var(--sapHC_StandardForeground,#fff));--sapShell_TextColor:var(--sapTextColor,var(--sapHC_StandardForeground,#fff));--sapField_TextColor:var(--sapTextColor,var(--sapHC_StandardForeground,#fff));--sapField_RequiredColor:var(--sapTextColor,var(--sapHC_StandardForeground,#fff));--sapUiBaseText:var(--sapTextColor,var(--sapHC_StandardForeground,#fff));--sapUiLink:var(--sapLinkColor,var(--sapHC_StandardForeground,#fff));--sapUiErrorBG:var(--sapErrorBackground,var(--sapHC_StandardBackground,#000));--sapUiWarningBG:var(--sapWarningBackground,var(--sapHC_StandardBackground,#000));--sapUiSuccessBG:var(--sapSuccessBackground,var(--sapHC_StandardBackground,#000));--sapUiInformationBG:var(--sapInformationBackground,var(--sapHC_StandardBackground,#000));--sapUiNeutralBG:var(--sapNeutralBackground,var(--sapHC_StandardBackground,#000));--sapNegativeElementColor:var(--sapNegativeColor,var(--sapHC_NegativeColor,#ff5e5e));--sapNegativeTextColor:var(--sapNegativeColor,var(--sapHC_NegativeColor,#ff5e5e));--sapErrorColor:var(--sapNegativeColor,var(--sapHC_NegativeColor,#ff5e5e));--sapUiNegative:var(--sapNegativeColor,var(--sapHC_NegativeColor,#ff5e5e));--sapCriticalElementColor:var(--sapCriticalColor,var(--sapHC_CriticalColor,#ffab1d));--sapCriticalTextColor:var(--sapCriticalColor,var(--sapHC_CriticalColor,#ffab1d));--sapWarningColor:var(--sapCriticalColor,var(--sapHC_CriticalColor,#ffab1d));--sapUiCritical:var(--sapCriticalColor,var(--sapHC_CriticalColor,#ffab1d));--sapPositiveElementColor:var(--sapPositiveColor,var(--sapHC_PositiveColor,#9c9));--sapPositiveTextColor:var(--sapPositiveColor,var(--sapHC_PositiveColor,#9c9));--sapSuccessColor:var(--sapPositiveColor,var(--sapHC_PositiveColor,#9c9));--sapUiPositive:var(--sapPositiveColor,var(--sapHC_PositiveColor,#9c9));--sapInformativeElementColor:var(--sapInformativeColor,var(--sapHC_InformativeColor,#7a5100));--sapInformativeTextColor:var(--sapInformativeColor,var(--sapHC_InformativeColor,#7a5100));--sapInformationColor:var(--sapInformativeColor,var(--sapHC_InformativeColor,#7a5100));--sapUiInformative:var(--sapInformativeColor,var(--sapHC_InformativeColor,#7a5100));--sapNeutralBorderColor:var(--sapNeutralColor,var(--sapHC_NeutralColor,#fff));--sapNeutralElementColor:var(--sapNeutralColor,var(--sapHC_NeutralColor,#fff));--sapNeutralTextColor:var(--sapNeutralColor,var(--sapHC_NeutralColor,#fff));--sapUiNeutralBorder:var(--sapNeutralColor,var(--sapHC_NeutralColor,#fff));--sapUiNeutral:var(--sapNeutralColor,var(--sapHC_NeutralColor,#fff));--sapList_SelectionBackgroundColor:var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94));--sapUiSelected:var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94));--sapUiContentIconHeight:var(--sapContent_IconHeight,var(--sapContent_GridSize,1rem));--sapContent_ContrastIconColor:var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff));--sapContent_NonInteractiveIconColor:var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff));--sapContent_MarkerIconColor:var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff));--sapScrollBar_SymbolColor:var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff));--sapUiContentIconColor:var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff));--sapUiContentImagePlaceholderForegroundColor:var(--sapContent_ImagePlaceholderForegroundColor,var(--sapHC_ReducedAltForeground,#999));--sapContent_ContrastFocusColor:var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff));--sapUiContentFocusColor:var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff));--sapContent_ContrastShadowColor:var(--sapContent_ShadowColor,var(--sapHC_StandardForeground,#fff));--sapUiContentShadowColor:var(--sapContent_ShadowColor,var(--sapHC_StandardForeground,#fff));--sapUiContentHelpColor:var(--sapContent_HelpColor,var(--sapHC_EnhancedForeground,#03b803));--sapUiContentDisabledTextColor:var(--sapContent_DisabledTextColor,var(--sapHC_ReducedForeground,#666));--sapUiContentForegroundBorderColor:var(--sapContent_ForegroundBorderColor,var(--sapHC_StandardForeground,#fff));--sapUiShellBorderColor:var(--sapShell_BorderColor,var(--sapHC_StandardForeground,#fff));--sapUiButtonBorderWidth:var(--sapButton_BorderWidth,var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem))));--sapButton_Hover_BorderColor:var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff));--sapButton_Emphasized_BorderColor:var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff));--sapUiButtonBorderColor:var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff));--sapField_Hover_BorderColor:var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff));--sapField_Focus_BorderColor:var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff));--sapField_InvalidColor:var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff));--sapField_WarningColor:var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff));--sapField_SuccessColor:var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff));--sapField_InformationColor:var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff));--sapUiFieldBorderColor:var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff));--sapUiFieldBorderWidth:var(--sapField_BorderWidth,var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem))));--sapField_ReadOnly_HelpBackground:var(--sapField_ReadOnly_Background,var(--sapHC_ReducedBackground,#585858));--sapUiFieldReadOnlyBackground:var(--sapField_ReadOnly_Background,var(--sapHC_ReducedBackground,#585858));--sapUiFieldReadOnlyBorderColor:var(--sapField_ReadOnly_BorderColor,var(--sapHC_ReducedAltForeground,#999));--sapUiGroupTitleBorderColor:var(--sapGroup_TitleBorderColor,var(--sapHC_StandardForeground,#fff));--sapUiGroupContentBorderColor:var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff));--sapUiGroupBorderWidth:var(--sapGroup_BorderWidth,var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem))));--sapUiToolbarSeparatorColor:var(--sapToolbar_SeparatorColor,var(--sapHC_StandardForeground,#fff));--sapUiListHeaderBorderColor:var(--sapList_HeaderBorderColor,var(--sapHC_StandardForeground,#fff));--sapUiListBorderColor:var(--sapList_BorderColor,var(--sapHC_ReducedAltForeground,#999));--sapUiListBorderWidth:var(--sapList_BorderWidth,var(--sapElement_BorderWidth,calc(0.0625*var(--sapContent_GridSize, 1rem))));--sapScrollBar_BorderColor:var(--sapScrollBar_FaceColor,var(--sapHC_ReducedAltForeground,#999));--sapUiScrollBarFaceColor:var(--sapScrollBar_FaceColor,var(--sapHC_ReducedAltForeground,#999));--sapUiScrollBarHoverFaceColor:var(--sapScrollBar_Hover_FaceColor,var(--sapHC_StandardForeground,#fff));--sapUiPageHeaderBorderColor:var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff));--sapUiTileBorderColor:var(--sapTile_BorderColor,var(--sapHC_StandardForeground,#fff));--sapUiFontHeaderFamily:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));--sapUiDesktopFontFamily:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));--sapUiListGroupHeaderBackground:var(--sapUiHcReducedBackground,var(--sapHC_ReducedBackground,#585858));--_ui5_daypicker_item_weekend_background_color:var(--sapUiHcReducedBackground,var(--sapHC_ReducedBackground,#585858));--_ui5_select_disabled_background:var(--sapUiHcReducedBackground,var(--sapHC_ReducedBackground,#585858));--_ui5_switch_track_disabled_checked_bg:var(--sapUiHcReducedBackground,var(--sapHC_ReducedBackground,#585858));--_ui5_switch_track_disabled_semantic_checked_bg:var(--sapUiHcReducedBackground,var(--sapHC_ReducedBackground,#585858));--_ui5_switch_handle_disabled_semantic_checked_bg:var(--sapUiHcReducedBackground,var(--sapHC_ReducedBackground,#585858));--_ui5_daypicker_dayname_color:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--_ui5_daypicker_weekname_color:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--_ui5_select_disabled_border_color:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--_ui5_switch_track_disabled_border_color:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--_ui5_switch_track_disabled_semantic_checked_border_color:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--_ui5_switch_track_disabled_semantic_border_color:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--_ui5_switch_handle_disabled_checked_bg:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--_ui5_switch_handle_disabled_border_color:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--_ui5_switch_handle_disabled_semantic_checked_border_color:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--_ui5_switch_handle_disabled_semantic_border_color:var(--sapUiHcReducedForeground,var(--sapHC_ReducedForeground,#666));--sapUiFieldPlaceholderTextColor:var(--sapUiHcReducedAltForeground,var(--sapHC_ReducedAltForeground,#999));--_ui5_switch_text_disabled_color:var(--sapUiHcReducedAltForeground,var(--sapHC_ReducedAltForeground,#999));--sapUiPageHeaderBackground:var(--sapPageHeader_Background,var(--sapBaseColor,var(--sapHC_StandardBackground,#000)));--sapUiObjectHeaderBackground:var(--sapObjectHeader_Background,var(--sapBaseColor,var(--sapHC_StandardBackground,#000)));--sapUiContentImagePlaceholderBackground:var(--sapContent_ImagePlaceholderBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiContentForegroundColor:var(--sapContent_ForegroundColor,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiShellBackground:var(--sapShell_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiShellBackgroundImage:var(--sapShell_BackgroundImage,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiShellBackgroundPatternColor:var(--sapShell_BackgroundPatternColor,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiShellBackgroundGradient:var(--sapShell_BackgroundGradient,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapButton_Emphasized_Background:var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapButton_Reject_Background:var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapButton_Accept_Background:var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiButtonBackground:var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapField_HelpBackground:var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapField_Hover_Background:var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapField_Hover_HelpBackground:var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapField_Focus_Background:var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapField_Focus_HelpBackground:var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapField_WarningBackground:var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapField_SuccessBackground:var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapField_InformationBackground:var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiFieldBackground:var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiGroupTitleBackground:var(--sapGroup_TitleBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiGroupContentBackground:var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiGroupFooterBackground:var(--sapGroup_FooterBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiToolbarBackground:var(--sapToolbar_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiListHeaderBackground:var(--sapList_HeaderBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiListBackground:var(--sapList_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiScrollBarTrackColor:var(--sapScrollBar_TrackColor,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiPageFooterBackground:var(--sapPageFooter_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiInfobarBackground:var(--sapInfobar_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiBlockLayerBackground:var(--sapBlockLayer_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapUiTileBackground:var(--sapTile_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000)));--sapActiveColor:var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapContent_SearchHighlightColor:var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapContent_BadgeBackground:var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapButton_Hover_Background:var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapField_InvalidBackground:var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapList_HighlightColor:var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapList_Hover_Background:var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapUiHighlight:var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapUiShellHoverBackground:var(--sapUiBrand,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapUiShellActiveBackground:var(--sapUiBrand,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)));--sapUiTextTitle:var(--sapTitleColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapUiContentMarkerTextColor:var(--sapContent_MarkerTextColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapUiContentLabelColor:var(--sapContent_LabelColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapUiContentContrastTextColor:var(--sapContent_ContrastTextColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapShell_InteractiveTextColor:var(--sapShell_TextColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapUiShellTextColor:var(--sapShell_TextColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldTextColor:var(--sapField_TextColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldRequiredColor:var(--sapField_RequiredColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapUiShellActiveTextColor:var(--sapUiBaseText,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapUiListTextColor:var(--sapUiBaseText,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--_ui5_switch_track_hover_border_color:var(--sapUiBaseText,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--_ui5_switch_text_on_semantic_color:var(--sapUiBaseText,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--_ui5_switch_text_off_semantic_color:var(--sapUiBaseText,var(--sapTextColor,var(--sapHC_StandardForeground,#fff)));--sapUiLinkActive:var(--sapUiLink,var(--sapLinkColor,var(--sapHC_StandardForeground,#fff)));--sapUiLinkVisited:var(--sapUiLink,var(--sapLinkColor,var(--sapHC_StandardForeground,#fff)));--sapUiLinkHover:var(--sapUiLink,var(--sapLinkColor,var(--sapHC_StandardForeground,#fff)));--sapUiLinkInverted:var(--sapUiLink,var(--sapLinkColor,var(--sapHC_StandardForeground,#fff)));--sapUiNegativeElement:var(--sapNegativeElementColor,var(--sapNegativeColor,var(--sapHC_NegativeColor,#ff5e5e)));--sapUiNegativeText:var(--sapNegativeTextColor,var(--sapNegativeColor,var(--sapHC_NegativeColor,#ff5e5e)));--sapErrorBorderColor:var(--sapErrorColor,var(--sapNegativeColor,var(--sapHC_NegativeColor,#ff5e5e)));--sapUiCriticalElement:var(--sapCriticalElementColor,var(--sapCriticalColor,var(--sapHC_CriticalColor,#ffab1d)));--sapUiCriticalText:var(--sapCriticalTextColor,var(--sapCriticalColor,var(--sapHC_CriticalColor,#ffab1d)));--sapWarningBorderColor:var(--sapWarningColor,var(--sapCriticalColor,var(--sapHC_CriticalColor,#ffab1d)));--sapUiPositiveElement:var(--sapPositiveElementColor,var(--sapPositiveColor,var(--sapHC_PositiveColor,#9c9)));--sapUiPositiveText:var(--sapPositiveTextColor,var(--sapPositiveColor,var(--sapHC_PositiveColor,#9c9)));--sapSuccessBorderColor:var(--sapSuccessColor,var(--sapPositiveColor,var(--sapHC_PositiveColor,#9c9)));--sapUiInformativeElement:var(--sapInformativeElementColor,var(--sapInformativeColor,var(--sapHC_InformativeColor,#7a5100)));--sapUiInformativeText:var(--sapInformativeTextColor,var(--sapInformativeColor,var(--sapHC_InformativeColor,#7a5100)));--sapInformationBorderColor:var(--sapInformationColor,var(--sapInformativeColor,var(--sapHC_InformativeColor,#7a5100)));--sapUiNeutralElement:var(--sapNeutralElementColor,var(--sapNeutralColor,var(--sapHC_NeutralColor,#fff)));--sapUiNeutralText:var(--sapNeutralTextColor,var(--sapNeutralColor,var(--sapHC_NeutralColor,#fff)));--sapUiListSelectionBackgroundColor:var(--sapList_SelectionBackgroundColor,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--sapUiShellHoverToggleBackground:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--sapUiToggleButtonPressedBackground:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--_ui5_checkbox_hover_background:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--_ui5_radiobutton_hover_fill:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--_ui5_tc_headerItemIcon_selected_background:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--_ui5_tc_headerItemIcon_positive_selected_background:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--_ui5_tc_headerItemIcon_negative_selected_background:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--_ui5_tc_headerItemIcon_critical_selected_background:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--_ui5_tc_headerItemIcon_neutral_selected_background:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94)));--sapUiContentContrastIconColor:var(--sapContent_ContrastIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--sapUiContentNonInteractiveIconColor:var(--sapContent_NonInteractiveIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--sapUiContentMarkerIconColor:var(--sapContent_MarkerIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--sapUiScrollBarSymbolColor:var(--sapScrollBar_SymbolColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--ui5-busyindicator-color:var(--sapUiContentIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--_ui5_checkbox_checkmark_color:var(--sapUiContentIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--_ui5_radiobutton_selected_fill:var(--sapUiContentIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--_ui5_radiobutton_selected_warning_fill:var(--sapUiContentIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--_ui5_radiobutton_selected_error_fill:var(--sapUiContentIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--_ui5_tc_headerItemIcon_selected_color:var(--sapUiContentIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--_ui5_tc_headerItemIcon_semantic_selected_color:var(--sapUiContentIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff)));--sapUiContentContrastFocusColor:var(--sapContent_ContrastFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--_ui5_button_positive_border_focus_hover_color:var(--sapUiContentFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--_ui5_button_focus_after_border:0.125rem dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--_ui5_calendar_header_middle_button_focus_border:0.125rem dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--_ui5_card_header_focus_border:0.125rem dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--_ui5_checkbox_focus_outline:0.125rem dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--_ui5_monthpicker_item_focus_after_border:2px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--_ui5_panel_focus_border:0.125rem dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--_ui5_tc_headerItem_focus_border:0.125rem dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--_ui5_yearpicker_item_focus_after_border:2px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,var(--sapHC_StandardForeground,#fff)));--sapUiContentContrastShadowColor:var(--sapContent_ContrastShadowColor,var(--sapContent_ShadowColor,var(--sapHC_StandardForeground,#fff)));--sapUiShadowLevel0:0 0 0 1px var(--sapUiContentShadowColor,var(--sapContent_ShadowColor,var(--sapHC_StandardForeground,#fff)));--sapUiDragAndDropActiveColor:var(--sapUiContentHelpColor,var(--sapContent_HelpColor,var(--sapHC_EnhancedForeground,#03b803)));--sapUiDragAndDropActiveBorderColor:var(--sapUiContentHelpColor,var(--sapContent_HelpColor,var(--sapHC_EnhancedForeground,#03b803)));--sapUiButtonHeaderDisabledTextColor:var(--sapUiContentDisabledTextColor,var(--sapContent_DisabledTextColor,var(--sapHC_ReducedForeground,#666)));--_ui5_input_disabled_color:var(--sapUiContentDisabledTextColor,var(--sapContent_DisabledTextColor,var(--sapHC_ReducedForeground,#666)));--sapUiDragAndDropBorderColor:var(--sapUiContentForegroundBorderColor,var(--sapContent_ForegroundBorderColor,var(--sapHC_StandardForeground,#fff)));--_ui5_switch_track_checked_border_color:var(--sapUiContentForegroundBorderColor,var(--sapContent_ForegroundBorderColor,var(--sapHC_StandardForeground,#fff)));--_ui5_switch_handle_semantic_hover_border_color:var(--sapUiContentForegroundBorderColor,var(--sapContent_ForegroundBorderColor,var(--sapHC_StandardForeground,#fff)));--_ui5_switch_handle_semantic_checked_hover_border_color:var(--sapUiContentForegroundBorderColor,var(--sapContent_ForegroundBorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiButtonHoverBorderColor:var(--sapButton_Hover_BorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiButtonEmphasizedBorderColor:var(--sapButton_Emphasized_BorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiButtonActiveBorderColor:var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiButtonAcceptBorderColor:var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiButtonRejectBorderColor:var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiButtonLiteBorderColor:var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiToggleButtonPressedBorderColor:var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiSegmentedButtonBorderColor:var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiSegmentedButtonFooterBorderColor:var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--_ui5_calendar_header_arrow_button_border:1px solid var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--_ui5_messagestrip_close_button_border:1px solid var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--_ui5_token_border_color:var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldHoverBorderColor:var(--sapField_Hover_BorderColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldFocusBorderColor:var(--sapField_Focus_BorderColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldInvalidColor:var(--sapField_InvalidColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldWarningColor:var(--sapField_WarningColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldSuccessColor:var(--sapField_SuccessColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldInformationColor:var(--sapField_InformationColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldActiveBorderColor:var(--sapUiFieldBorderColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff)));--_ui5_checkbox_inner_border:solid .125rem var(--sapUiFieldBorderColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiFieldReadOnlyHelpBackground:var(--sapField_ReadOnly_HelpBackground,var(--sapField_ReadOnly_Background,var(--sapHC_ReducedBackground,#585858)));--_ui5_input_disabled_background:var(--sapUiFieldReadOnlyBackground,var(--sapField_ReadOnly_Background,var(--sapHC_ReducedBackground,#585858)));--_ui5_checkbox_inner_readonly_border:0.125rem solid var(--sapUiFieldReadOnlyBorderColor,var(--sapField_ReadOnly_BorderColor,var(--sapHC_ReducedAltForeground,#999)));--_ui5_input_disabled_border_color:var(--sapUiFieldReadOnlyBorderColor,var(--sapField_ReadOnly_BorderColor,var(--sapHC_ReducedAltForeground,#999)));--ui5-panel-bottom-border-color:var(--sapUiGroupTitleBorderColor,var(--sapGroup_TitleBorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiNotifierSeparator:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiNotificationBarBorder:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiPageFooterBorderColor:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiCalendarColorToday:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-1:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-2:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-3:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-4:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-5:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-6:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-7:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-8:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-9:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-badge-border-color-scheme-10:var(--sapUiGroupContentBorderColor,var(--sapGroup_ContentBorderColor,var(--sapHC_StandardForeground,#fff)));--sapUiButtonActionSelectBorderColor:var(--sapUiListBorderColor,var(--sapList_BorderColor,var(--sapHC_ReducedAltForeground,#999)));--_ui5_daypicker_item_border:1px solid var(--sapUiListBorderColor,var(--sapList_BorderColor,var(--sapHC_ReducedAltForeground,#999)));--ui5-listitem-border-bottom:1px solid var(--sapUiListBorderColor,var(--sapList_BorderColor,var(--sapHC_ReducedAltForeground,#999)));--_ui5_monthpicker_item_border:1px solid var(--sapUiListBorderColor,var(--sapList_BorderColor,var(--sapHC_ReducedAltForeground,#999)));--_ui5_yearpicker_item_border:1px solid var(--sapUiListBorderColor,var(--sapList_BorderColor,var(--sapHC_ReducedAltForeground,#999)));--sapUiScrollBarBorderColor:var(--sapScrollBar_BorderColor,var(--sapScrollBar_FaceColor,var(--sapHC_ReducedAltForeground,#999)));--sapUiObjectHeaderBorderColor:var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff)));--_ui5_card_border_color:var(--sapUiTileBorderColor,var(--sapTile_BorderColor,var(--sapHC_StandardForeground,#fff)));--ui5-group-header-listitem-background-color:var(--sapUiListGroupHeaderBackground,var(--sapUiHcReducedBackground,var(--sapHC_ReducedBackground,#585858)));--_ui5_tc_header_border_bottom:0.125rem solid var(--sapUiObjectHeaderBackground,var(--sapObjectHeader_Background,var(--sapBaseColor,var(--sapHC_StandardBackground,#000))));--sapUiShellContainerBackground:var(--sapUiShellBackground,var(--sapShell_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiShellAltContainerBackground:var(--sapUiShellBackground,var(--sapShell_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiButtonEmphasizedBackground:var(--sapButton_Emphasized_Background,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiButtonRejectBackground:var(--sapButton_Reject_Background,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiButtonAcceptBackground:var(--sapButton_Accept_Background,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiButtonLiteBackground:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiSegmentedButtonBackground:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_switch_track_bg:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_switch_track_hover_bg:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_switch_track_hover_checked_bg:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_switch_track_border_color:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_switch_track_disabled_bg:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_switch_track_disabled_semantic_bg:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_switch_handle_bg:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_switch_handle_disabled_bg:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_switch_handle_disabled_semantic_bg:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiFieldHelpBackground:var(--sapField_HelpBackground,var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiFieldHoverBackground:var(--sapField_Hover_Background,var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiFieldHoverHelpBackground:var(--sapField_Hover_HelpBackground,var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiFieldFocusBackground:var(--sapField_Focus_Background,var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiFieldFocusHelpBackground:var(--sapField_Focus_HelpBackground,var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiFieldWarningBackground:var(--sapField_WarningBackground,var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiFieldSuccessBackground:var(--sapField_SuccessBackground,var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiFieldInformationBackground:var(--sapField_InformationBackground,var(--sapField_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiNotificationBarBG:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiDragAndDropBackground:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiDragAndDropActiveBackground:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-1:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-2:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-3:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-4:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-5:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-6:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-7:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-8:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-9:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-badge-bg-color-scheme-10:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-panel-background-color:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiButtonActionSelectBackground:var(--sapUiListBackground,var(--sapList_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiListFooterBackground:var(--sapUiListBackground,var(--sapList_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiListTableGroupHeaderBackground:var(--sapUiListBackground,var(--sapList_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--_ui5_daypicker_item_othermonth_background_color:var(--sapUiListBackground,var(--sapList_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--ui5-listitem-background-color:var(--sapUiListBackground,var(--sapList_Background,var(--sapBackgroundColor,var(--sapHC_StandardBackground,#000))));--sapUiActive:var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--sapUiContentSearchHighlightColor:var(--sapContent_SearchHighlightColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--sapUiContentBadgeBackground:var(--sapContent_BadgeBackground,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--sapUiButtonHoverBackground:var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--sapUiFieldInvalidBackground:var(--sapField_InvalidBackground,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--sapUiListHighlightColor:var(--sapList_HighlightColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--sapUiListHoverBackground:var(--sapList_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--_ui5_card_header_hover_bg:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--_ui5_card_header_active_bg:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--_ui5_daypicker_item_hover_background_color:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--_ui5_daypicker_item_weekend_hover_background_color:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--_ui5_daypicker_item_othermonth_hover_background_color:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--_ui5_monthpicker_item_hover_background_color:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--_ui5_yearpicker_item_hover_background_color:var(--sapUiHighlight,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))));--_ui5_daypicker_item_othermonth_color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff))));--_ui5_daypicker_item_othermonth_hover_color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff))));--sapUiFieldActiveTextColor:var(--sapUiContentContrastTextColor,var(--sapContent_ContrastTextColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff))));--sapUiShellInteractiveTextColor:var(--sapShell_InteractiveTextColor,var(--sapShell_TextColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff))));--sapUiShellGroupTextColor:var(--sapUiShellTextColor,var(--sapShell_TextColor,var(--sapTextColor,var(--sapHC_StandardForeground,#fff))));--sapUiErrorBorder:var(--sapErrorBorderColor,var(--sapErrorColor,var(--sapNegativeColor,var(--sapHC_NegativeColor,#ff5e5e))));--sapUiWarningBorder:var(--sapWarningBorderColor,var(--sapWarningColor,var(--sapCriticalColor,var(--sapHC_CriticalColor,#ffab1d))));--sapUiSuccessBorder:var(--sapSuccessBorderColor,var(--sapSuccessColor,var(--sapPositiveColor,var(--sapHC_PositiveColor,#9c9))));--sapUiInformationBorder:var(--sapInformationBorderColor,var(--sapInformationColor,var(--sapInformativeColor,var(--sapHC_InformativeColor,#7a5100))));--sapUiSegmentedButtonSelectedBackground:var(--sapUiToggleButtonPressedBackground,var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94))));--_ui5_switch_handle_checked_bg:var(--sapUiToggleButtonPressedBackground,var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94))));--_ui5_switch_track_checked_bg:var(--sapUiToggleButtonPressedBackground,var(--sapUiSelected,var(--sapSelectedColor,var(--sapHC_HighlightAltBackground,#0f5d94))));--sapUiDragAndDropColor:var(--sapUiContentNonInteractiveIconColor,var(--sapContent_NonInteractiveIconColor,var(--sapContent_IconColor,var(--sapHC_StandardForeground,#fff))));--sapUiButtonEmphasizedHoverBorderColor:var(--sapUiButtonHoverBorderColor,var(--sapButton_Hover_BorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiButtonLiteHoverBorderColor:var(--sapUiButtonHoverBorderColor,var(--sapButton_Hover_BorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiToggleButtonPressedHoverBorderColor:var(--sapUiButtonHoverBorderColor,var(--sapButton_Hover_BorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_token_hover_border_color:var(--sapUiButtonHoverBorderColor,var(--sapButton_Hover_BorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_button_emphasized_focused_border_color:var(--sapUiButtonEmphasizedBorderColor,var(--sapButton_Emphasized_BorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiButtonEmphasizedActiveBorderColor:var(--sapUiButtonActiveBorderColor,var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiButtonAcceptActiveBorderColor:var(--sapUiButtonActiveBorderColor,var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiButtonRejectActiveBorderColor:var(--sapUiButtonActiveBorderColor,var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiButtonLiteActiveBorderColor:var(--sapUiButtonActiveBorderColor,var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiButtonAcceptHoverBorderColor:var(--sapUiButtonAcceptBorderColor,var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_button_positive_border_color:var(--sapUiButtonAcceptBorderColor,var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiButtonRejectHoverBorderColor:var(--sapUiButtonRejectBorderColor,var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_switch_handle_checked_border_color:var(--sapUiToggleButtonPressedBorderColor,var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_select_hover_icon_left_border:0.0625rem solid var(--sapUiFieldHoverBorderColor,var(--sapField_Hover_BorderColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_select_rtl_hover_icon_right_border:0.0625rem solid var(--sapUiFieldHoverBorderColor,var(--sapField_Hover_BorderColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_checkbox_inner_error_border:0.125rem dashed var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_checkbox_inner_warning_border:0.125rem dashed var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_checkbox_checkmark_warning_color:var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapField_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiShadowHeader:inset 0 -0.125rem var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_tc_header_box_shadow:inset 0 -0.25rem 0 -0.125rem var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_tc_content_border_bottom:0.125rem solid var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_tc_headerItemContent_border_bottom:0.25rem solid var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_tc_headerItem_positive_selected_border_color:var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_tc_headerItem_negative_selected_border_color:var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_tc_headerItem_critical_selected_border_color:var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_tc_headerItem_neutral_selected_border_color:var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_tc_headerItemIcon_border:1px solid var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_tc_headerItemIcon_color:var(--sapUiObjectHeaderBorderColor,var(--sapUiPageHeaderBorderColor,var(--sapPageHeader_BorderColor,var(--sapHC_StandardForeground,#fff))));--_ui5_card_header_border_color:var(--_ui5_card_border_color,var(--sapUiTileBorderColor,var(--sapTile_BorderColor,var(--sapHC_StandardForeground,#fff))));--sapUiButtonActiveBackground:var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiFieldActiveBackground:var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiButtonEmphasizedHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiButtonAcceptHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiButtonRejectHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiButtonLiteHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiToggleButtonPressedHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiSegmentedButtonHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiSegmentedButtonFooterHoverBackground:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--_ui5_switch_handle_hover_bg:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--_ui5_switch_handle_semantic_hover_bg:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--_ui5_switch_handle_semantic_checked_hover_bg:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiListActiveBackground:var(--sapUiListHighlightColor,var(--sapList_HighlightColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiButtonLiteActionSelectHoverBackground:var(--sapUiListHoverBackground,var(--sapList_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiListSelectionHoverBackground:var(--sapUiListHoverBackground,var(--sapList_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiInfobarHoverBackground:var(--sapUiListHoverBackground,var(--sapList_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100)))));--sapUiSegmentedButtonSelectedHoverBorderColor:var(--sapUiToggleButtonPressedHoverBorderColor,var(--sapUiButtonHoverBorderColor,var(--sapButton_Hover_BorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)))));--_ui5_button_positive_border_hover_color:var(--sapUiButtonAcceptHoverBorderColor,var(--sapUiButtonAcceptBorderColor,var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,var(--sapHC_StandardForeground,#fff)))));--sapUiButtonEmphasizedActiveBackground:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))))));--sapUiButtonAcceptActiveBackground:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))))));--sapUiButtonRejectActiveBackground:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))))));--sapUiButtonLiteActiveBackground:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))))));--sapUiSegmentedButtonActiveBackground:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))))));--sapUiButtonFooterHoverBackground:var(--sapUiButtonLiteHoverBackground,var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))))));--sapUiSegmentedButtonSelectedHoverBackground:var(--sapUiToggleButtonPressedHoverBackground,var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))))));--_ui5_switch_handle_checked_hover_bg:var(--sapUiToggleButtonPressedHoverBackground,var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))))));--sapUiInfobarActiveBackground:var(--sapUiListActiveBackground,var(--sapUiListHighlightColor,var(--sapList_HighlightColor,var(--sapHighlightColor,var(--sapBrandColor,var(--sapHC_HighlightBackground,#7a5100))))));--sapBackgroundColorFade72:rgba(0,0,0,0.72);--sapUiAccent1Lighten50:#fff;--sapUiAccent2Lighten40:#fff;--sapUiAccent3Lighten46:#fff;--sapUiAccent4Lighten46:#fff;--sapUiAccent5Lighten32:#fff;--sapUiAccent6Lighten52:#fff;--sapUiAccent7Lighten64:#fff;--sapUiAccent8Lighten61:#fff;--sapUiAccent9Lighten37:#fff;--sapUiAccent10Lighten49:#fff;--sapUiLinkDarken15:#d9d9d9;--sapUiErrorBGLighten4:#0a0a0a;--sapUiSuccessBGLighten5:#0d0d0d;--sapUiSelectedDarken10:#0a4066;--sapUiShellBorderColorLighten30:#fff;--sapUiListTableGroupHeaderBorderColor:#fff;--sapUiListTableFooterBorder:#fff;--sapUiListTableFixedBorder:#fff;--sapUiListVerticalBorderColor:#fff;--sapUiListBorderColorLighten10:#b3b3b3;--sapUiContentForegroundColorLighten5:#0d0d0d;--sapUiContentForegroundColorLighten7:#121212;--sapUiContentForegroundColorDarken3:#000;--sapUiContentForegroundColorDarken5:#000;--sapUiContentForegroundColorDarken10:#000;--sapUiButtonBackgroundDarken7:#000;--sapUiButtonBackgroundDarken2:#000;--sapUiButtonBackgroundDarken10:#000;--sapUiListBackgroundDarken3:#000;--sapUiListBackgroundDarken10:#000;--sapUiListBackgroundDarken13:#000;--sapUiListBackgroundDarken15:#000;--sapUiListBackgroundDarken20:#000;--sapUiTileBackgroundDarken20:#000;--_ui5_link_subtle_color:var(--sapUiLinkDarken15,#d9d9d9);--_ui5_daypicker_item_selected_background_color:var(--sapUiSelectedDarken10,#0a4066);--_ui5_daypicker_item_selected_hover_background_color:var(--sapUiSelectedDarken10,#0a4066);--_ui5_monthpicker_item_selected_hover:var(--sapUiSelectedDarken10,#0a4066);--_ui5_monthpicker_item_selected_focus:var(--sapUiSelectedDarken10,#0a4066);--_ui5_yearpicker_item_selected_focus:var(--sapUiSelectedDarken10,#0a4066);--sapUiContentContrastShadowColorFade50:hsla(0,0%,100%,0.5);--sapUiContentContrastShadowColorFade60:hsla(0,0%,100%,0.6);--sapUiContentContrastShadowColorFade80:hsla(0,0%,100%,0.8);--sapUiFieldWarningColorDarken100:#000;--_ui5_daypicker_item_now_selected_text_border_color:var(--sapUiListBorderColorLighten10,#b3b3b3);--_ui5_daypicker_item_background_color:var(--sapUiContentForegroundColorLighten5,#0d0d0d);--_ui5_monthpicker_item_background_color:var(--sapUiContentForegroundColorLighten7,#121212);--_ui5_yearpicker_item_background_color:var(--sapUiContentForegroundColorLighten7,#121212);--_ui5_monthpicker_item_focus_background_color:var(--sapUiContentForegroundColorDarken5,#000);--_ui5_yearpicker_item_focus_background_color:var(--sapUiContentForegroundColorDarken5,#000);--sapUiActiveLighten3:#895b00;--sapUiButtonHoverBackgroundDarken2:#704a00;--sapUiButtonHoverBackgroundDarken5:#614000;--sapUiButtonAcceptActiveBackgroundDarken5:#614000;--sapUiButtonAcceptActiveBackgroundLighten5:#946200;--sapUiButtonRejectActiveBackgroundDarken5:#614000;--sapUiButtonRejectActiveBackgroundLighten5:#946200;--_ui5_toggle_button_pressed_positive_hover:var(--sapUiButtonAcceptActiveBackgroundDarken5,#614000);--_ui5_toggle_button_pressed_negative_hover:var(--sapUiButtonRejectActiveBackgroundDarken5,#614000);--sapUiToggleButtonPressedBackgroundLighten50Desaturate47:#c1d4e1;--sapUiToggleButtonPressedBorderColorLighten19Desaturate46:#fff;--sapUiShadowLevel1:0 0 1rem 0 hsla(0,0%,100%,0.5),0 0 0 2px #fff;--sapUiShadowLevel2:0 0.25rem 2rem 0 hsla(0,0%,100%,0.6),0 0 0 2px #fff;--sapUiShadowLevel3:0 0.625rem 4rem 0 hsla(0,0%,100%,0.8),0 0 0 2px #fff;--sapUiCalloutShadow:var(--sapUiShadowLevel2,0 0.25rem 2rem 0 hsla(0,0%,100%,0.6),0 0 0 2px #fff);--sapGroup_TitleTextColor:#fff;--sapPageHeader_TextColor:#fff;--sapContent_ForegroundTextColor:#fff;--sapButton_TextColor:#fff;--sapList_HeaderTextColor:#fff;--sapPageFooter_TextColor:#fff;--sapTile_TextColor:#fff;--sapTile_IconColor:#fff;--sapHighlightTextColor:#fff;--sapUiGroupTitleTextColor:var(--sapGroup_TitleTextColor,#fff);--sapUiPageHeaderTextColor:var(--sapPageHeader_TextColor,#fff);--sapUiContentForegroundTextColor:var(--sapContent_ForegroundTextColor,#fff);--sapUiButtonIconColor:#fff;--sapUiButtonTextColor:var(--sapButton_TextColor,#fff);--sapUiListHeaderTextColor:var(--sapList_HeaderTextColor,#fff);--sapUiPageFooterTextColor:var(--sapPageFooter_TextColor,#fff);--sapUiTileTextColor:var(--sapTile_TextColor,#fff);--sapUiTileIconColor:var(--sapTile_IconColor,#fff);--sapUiHighlightTextColor:var(--sapHighlightTextColor,#fff);--_ui5_tc_headerItem_color:var(--sapUiGroupTitleTextColor,var(--sapGroup_TitleTextColor,#fff));--_ui5_tc_overflowItem_default_color:var(--sapUiGroupTitleTextColor,var(--sapGroup_TitleTextColor,#fff));--sapUiSegmentedButtonIconColor:#fff;--sapUiButtonHeaderTextColor:var(--sapUiButtonTextColor,var(--sapButton_TextColor,#fff));--sapUiListTableGroupHeaderTextColor:#fff;--sapUiListFooterTextColor:var(--sapUiPageFooterTextColor,var(--sapPageFooter_TextColor,#fff));--sapUiSegmentedButtonSelectedIconColor:#fff;--sapUiListActiveTextColor:#fff;--sapUiSegmentedButtonActiveIconColor:#fff;--sapButton_Emphasized_TextColor:#fff;--sapButton_Hover_TextColor:#fff;--sapTile_TitleTextColor:#fff;--sapUiButtonFooterTextColor:#fff;--sapUiToggleButtonPressedTextColor:#fff;--sapUiButtonRejectTextColor:#fff;--sapUiButtonAcceptTextColor:#fff;--sapUiButtonLiteTextColor:#fff;--sapUiSegmentedButtonTextColor:#fff;--sapUiButtonActiveTextColor:#fff;--sapUiButtonEmphasizedTextColor:var(--sapButton_Emphasized_TextColor,#fff);--sapUiButtonHoverTextColor:var(--sapButton_Hover_TextColor,#fff);--sapUiTileTitleTextColor:var(--sapTile_TitleTextColor,#fff);--sapUiSegmentedButtonSelectedTextColor:var(--sapUiToggleButtonPressedTextColor,#fff);--sapUiSegmentedButtonActiveTextColor:#fff}";

registerThemeProperties("@ui5/webcomponents", "sap_belize", belizeThemeProperties);
registerThemeProperties("@ui5/webcomponents", "sap_belize_hcb", belizeHcbThemeProperties);

let jQuery = {};
const inject = (jQueryNew) => {
    jQuery = jQueryNew;
};

var class2type = {};
var hasOwn = class2type.hasOwnProperty;
var toString = class2type.toString;
var fnToString = hasOwn.toString;
var ObjectFunctionString = fnToString.call(Object);
var fnIsPlainObject = function (obj) {
  var proto, Ctor;
  if (!obj || toString.call(obj) !== "[object Object]") {
    return false;
  }
  proto = Object.getPrototypeOf(obj);
  if (!proto) {
    return true;
  }
  Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && fnToString.call(Ctor) === ObjectFunctionString;
};

/* eslint-disable */

var jQuery$1 = {
	extend: function() {
		var options, name, src, copy, copyIsArray, clone,
			target = arguments[ 0 ] || {},
			i = 1,
			length = arguments.length,
			deep = false;

		// Handle a deep copy situation
		if ( typeof target === "boolean" ) {
			deep = target;

			// Skip the boolean and the target
			target = arguments[ i ] || {};
			i++;
		}

		// Handle case when target is a string or something (possible in deep copy)
		if ( typeof target !== "object" && typeof target !== "function" ) {
			target = {};
		}

		// Extend jQuery itself if only one argument is passed
		if ( i === length ) {
			target = this;
			i--;
		}

		for ( ; i < length; i++ ) {

			// Only deal with non-null/undefined values
			if ( ( options = arguments[ i ] ) != null ) {

				// Extend the base object
				for ( name in options ) {
					src = target[ name ];
					copy = options[ name ];

					// Prevent never-ending loop
					if ( target === copy ) {
						continue;
					}

					// Recurse if we're merging plain objects or arrays
					if ( deep && copy && ( fnIsPlainObject( copy ) ||
							( copyIsArray = Array.isArray( copy ) ) ) ) {

						if ( copyIsArray ) {
							copyIsArray = false;
							clone = src && Array.isArray( src ) ? src : [];

						} else {
							clone = src && fnIsPlainObject( src ) ? src : {};
						}

						// Never move original objects, clone them
						target[ name ] = extend( deep, clone, copy );

						// Don't bring in undefined values
					} else if ( copy !== undefined ) {
						target[ name ] = copy;
					}
				}
			}
		}

		// Return the modified object
		return target;
	},
	ajaxSettings: {
		converters: {
			"text json": (data) => JSON.parse( data + "" )
		}
	},
	trim: function (str) {
		return str.trim();
	}
};

window.jQuery = window.jQuery || jQuery$1;
inject(jQuery$1);

/* eslint-enable */

var CalendarType = {
  Gregorian: "Gregorian",
  Islamic: "Islamic",
  Japanese: "Japanese",
  Persian: "Persian",
  Buddhist: "Buddhist"
};

var getDesigntimePropertyAsArray = value => {
	const m = /\$([-a-z0-9A-Z._]+)(?::([^$]*))?\$/.exec(value);
	return m && m[2] ? m[2].split(/,/) : null;
};

const CONFIGURATION = {
	theme: "sap_fiori_3",
	rtl: null,
	language: null,
	compactSize: false,
	supportedLanguages: null,
	calendarType: null,
	derivedRTL: null,
	"xx-wc-no-conflict": false, // no URL
};

/* General settings */
const getTheme = () => {
	return CONFIGURATION.theme;
};

const getRTL = () => {
	return CONFIGURATION.rtl;
};

const getLanguage = () => {
	return CONFIGURATION.language;
};

const getCompactSize = () => {
	return CONFIGURATION.compactSize;
};

const getSupportedLanguages = () => {
	return getDesigntimePropertyAsArray("$core-i18n-locales:,ar,bg,ca,cs,da,de,el,en,es,et,fi,fr,hi,hr,hu,it,iw,ja,ko,lt,lv,nl,no,pl,pt,ro,ru,sh,sk,sl,sv,th,tr,uk,vi,zh_CN,zh_TW$");
};

const getWCNoConflict = () => {
	return CONFIGURATION["xx-wc-no-conflict"];
};

const _setWCNoConflict = value => {
	CONFIGURATION["xx-wc-no-conflict"] = value;
};

/* Calendar stuff */
const getCalendarType = () => {
	if (CONFIGURATION.calendarType) {
		const type = Object.keys(CalendarType).filter(calType => calType === CONFIGURATION.calendarType)[0];

		if (type) {
			return type;
		}
	}

	return CalendarType.Gregorian;
};

const getOriginInfo = () => {};

const getLocale = () => {
	return CONFIGURATION.language;
};

const _setTheme = themeName => {
	CONFIGURATION.theme = themeName;
};

const booleanMapping = new Map();
booleanMapping.set("true", true);
booleanMapping.set("false", false);

let runtimeConfig = {};

const parseConfigurationScript = () => {
	const configScript = document.querySelector("[data-id='sap-ui-config']");
	let configJSON;

	if (configScript) {
		try {
			configJSON = JSON.parse(configScript.innerHTML);
		} catch (е) {
			console.warn("Incorrect data-sap-ui-config format. Please use JSON"); /* eslint-disable-line */
		}

		if (configJSON) {
			runtimeConfig = Object.assign({}, configJSON);
		}
	}
};

const parseURLParameters = () => {
	const params = new URLSearchParams(window.location.search);

	params.forEach((value, key) => {
		if (!key.startsWith("sap-ui")) {
			return;
		}

		const lowerCaseValue = value.toLowerCase();

		const param = key.split("sap-ui-")[1];

		if (booleanMapping.has(value)) {
			value = booleanMapping.get(lowerCaseValue);
		}

		runtimeConfig[param] = value;
	});
};

const applyConfigurations = () => {
	Object.keys(runtimeConfig).forEach(key => {
		CONFIGURATION[key] = runtimeConfig[key];
	});
};

const initConfiguration = () => {
	parseConfigurationScript();
	parseURLParameters();
	applyConfigurations();
};

var Configuration = /*#__PURE__*/Object.freeze({
    initConfiguration: initConfiguration,
    getTheme: getTheme,
    getRTL: getRTL,
    getLanguage: getLanguage,
    getCompactSize: getCompactSize,
    getWCNoConflict: getWCNoConflict,
    getCalendarType: getCalendarType,
    getLocale: getLocale,
    _setTheme: _setTheme,
    _setWCNoConflict: _setWCNoConflict,
    getSupportedLanguages: getSupportedLanguages,
    getOriginInfo: getOriginInfo
});

const rLocale = /^((?:[A-Z]{2,3}(?:-[A-Z]{3}){0,3})|[A-Z]{4}|[A-Z]{5,8})(?:-([A-Z]{4}))?(?:-([A-Z]{2}|[0-9]{3}))?((?:-[0-9A-Z]{5,8}|-[0-9][0-9A-Z]{3})*)((?:-[0-9A-WYZ](?:-[0-9A-Z]{2,8})+)*)(?:-(X(?:-[0-9A-Z]{1,8})+))?$/i;

class Locale {
	constructor(sLocaleId) {
		const aResult = rLocale.exec(sLocaleId.replace(/_/g, "-"));
		if (aResult === null) {
			throw new Error(`The given language ${sLocaleId} does not adhere to BCP-47.`);
		}
		this.sLocaleId = sLocaleId;
		this.sLanguage = aResult[1] || null;
		this.sScript = aResult[2] || null;
		this.sRegion = aResult[3] || null;
		this.sVariant = (aResult[4] && aResult[4].slice(1)) || null;
		this.sExtension = (aResult[5] && aResult[5].slice(1)) || null;
		this.sPrivateUse = aResult[6] || null;
		if (this.sLanguage) {
			this.sLanguage = this.sLanguage.toLowerCase();
		}
		if (this.sScript) {
			this.sScript = this.sScript.toLowerCase().replace(/^[a-z]/, s => {
				return s.toUpperCase();
			});
		}
		if (this.sRegion) {
			this.sRegion = this.sRegion.toUpperCase();
		}
	}

	getLanguage() {
		return this.sLanguage;
	}

	getScript() {
		return this.sScript;
	}

	getRegion() {
		return this.sRegion;
	}

	getVariant() {
		return this.sVariant;
	}

	getVariantSubtags() {
		return this.sVariant ? this.sVariant.split("-") : [];
	}

	getExtension() {
		return this.sExtension;
	}

	getExtensionSubtags() {
		return this.sExtension ? this.sExtension.slice(2).split("-") : [];
	}

	getPrivateUse() {
		return this.sPrivateUse;
	}

	getPrivateUseSubtags() {
		return this.sPrivateUse ? this.sPrivateUse.slice(2).split("-") : [];
	}

	hasPrivateUseSubtag(sSubtag) {
		return this.getPrivateUseSubtags().indexOf(sSubtag) >= 0;
	}

	toString() {
		const r = [this.sLanguage];

		if (this.sScript) {
			r.push(this.sScript);
		}
		if (this.sRegion) {
			r.push(this.sRegion);
		}
		if (this.sVariant) {
			r.push(this.sVariant);
		}
		if (this.sExtension) {
			r.push(this.sExtension);
		}
		if (this.sPrivateUse) {
			r.push(this.sPrivateUse);
		}
		return r.join("-");
	}

	static get _cldrLocales() {
		return getDesigntimePropertyAsArray("$cldr-locales:ar,ar_EG,ar_SA,bg,br,ca,cs,da,de,de_AT,de_CH,el,el_CY,en,en_AU,en_GB,en_HK,en_IE,en_IN,en_NZ,en_PG,en_SG,en_ZA,es,es_AR,es_BO,es_CL,es_CO,es_MX,es_PE,es_UY,es_VE,et,fa,fi,fr,fr_BE,fr_CA,fr_CH,fr_LU,he,hi,hr,hu,id,it,it_CH,ja,kk,ko,lt,lv,ms,nb,nl,nl_BE,nn,pl,pt,pt_PT,ro,ru,ru_UA,sk,sl,sr,sv,th,tr,uk,vi,zh_CN,zh_HK,zh_SG,zh_TW$");
	}

	static get _coreI18nLocales() {
		return getDesigntimePropertyAsArray("$core-i18n-locales:,ar,bg,ca,cs,da,de,el,en,es,et,fi,fr,hi,hr,hu,it,iw,ja,ko,lt,lv,nl,no,pl,pt,ro,ru,sh,sk,sl,sv,th,tr,uk,vi,zh_CN,zh_TW$");
	}
}

var detectNavigatorLanguage = () => {
	const browserLanguages = navigator.languages;

	const navigatorLanguage = () => {
		return navigator.language;
	};

	const rawLocale = (browserLanguages && browserLanguages[0]) || navigatorLanguage() || navigator.userLanguage || navigator.browserLanguage;

	return rawLocale || "en";
};

const convertToLocaleOrNull = lang => {
	try {
		if (lang && typeof lang === "string") {
			return new Locale(lang);
		}
	} catch (e) {
		// ignore
	}
};

/**
 * Returns the locale based on the configured language Configuration#getLanguage
 * If no language has been configured - a new locale based on browser language is returned
 */
const getLocale$1 = () => {
	if (getLanguage()) {
		return new Locale(getLanguage());
	}

	return convertToLocaleOrNull(detectNavigatorLanguage());
};

/**
 * Returns the language of #getLocale return value
 */
const getLanguage$1 = () => {
	return getLocale$1().sLanguage;
};

const mSettings = {};

const getFormatLocale = () => {
	const fallback = () => {
		let oLocale = getLocale$1();
		// if any user settings have been defined, add the private use subtag "sapufmt"
		if (!Object.keys(mSettings).length === 0) {
			// TODO move to Locale/LocaleData
			let l = oLocale.toString();
			if (l.indexOf("-x-") < 0) {
				l += "-x-sapufmt";
			} else if (l.indexOf("-sapufmt") <= l.indexOf("-x-")) {
				l += "-sapufmt";
			}
			oLocale = new Locale(l);
		}
		return oLocale;
	};

	// we do not support setting of locale, so we just leave the default behaviour
	return fallback();
};

const setConfiguration = configuration => {
};

const getCustomLocaleData = () => {
	return mSettings;
};

// needed for compatibilty
const getLegacyDateFormat = () => {};
const getLegacyDateCalendarCustomizing = () => {};

var FormatSettings = /*#__PURE__*/Object.freeze({
    setConfiguration: setConfiguration,
    getFormatLocale: getFormatLocale,
    getLegacyDateFormat: getLegacyDateFormat,
    getLegacyDateCalendarCustomizing: getLegacyDateCalendarCustomizing,
    getCustomLocaleData: getCustomLocaleData
});

/**
 * Shim for the OpenUI5 core
 * @deprecated - do not add new functionality
 */

const Core = {
	/**
	 * @deprecated - must be here for compatibility
	 */
	getConfiguration() {
		return Configuration;
	},

	/**
	 * @deprecated - must be here for compatibility
	 */
	getLibraryResourceBundle() {
	},

	getFormatSettings() {
		return FormatSettings;
	},
};

window.sap = window.sap || {};
window.sap.ui = window.sap.ui || {};

/**
 * @deprecated
 */
window.sap.ui.getWCCore = function getWCCore() {
	return Core;
};

var fnNow = !(typeof window != "undefined" && window.performance && performance.now && performance.timing) ? Date.now : (function () {
  var iNavigationStart = performance.timing.navigationStart;
  return function perfnow() {
    return iNavigationStart + performance.now();
  };
})();

var Log = {};
Log.Level = {
    NONE: -1,
    FATAL: 0,
    ERROR: 1,
    WARNING: 2,
    INFO: 3,
    DEBUG: 4,
    TRACE: 5,
    ALL: 5 + 1
};
var sDefaultComponent, aLog = [], mMaxLevel = { '': Log.Level.ERROR }, oListener = null, bLogSupportInfo = false;
function pad0(i, w) {
    return ('000' + String(i)).slice(-w);
}
function level(sComponent) {
    return !sComponent || isNaN(mMaxLevel[sComponent]) ? mMaxLevel[''] : mMaxLevel[sComponent];
}
function getLogEntryListenerInstance() {
    if (!oListener) {
        oListener = {
            listeners: [],
            onLogEntry: function (oLogEntry) {
                for (var i = 0; i < oListener.listeners.length; i++) {
                    if (oListener.listeners[i].onLogEntry) {
                        oListener.listeners[i].onLogEntry(oLogEntry);
                    }
                }
            },
            attach: function (oLog, oLstnr) {
                if (oLstnr) {
                    oListener.listeners.push(oLstnr);
                    if (oLstnr.onAttachToLog) {
                        oLstnr.onAttachToLog(oLog);
                    }
                }
            },
            detach: function (oLog, oLstnr) {
                for (var i = 0; i < oListener.listeners.length; i++) {
                    if (oListener.listeners[i] === oLstnr) {
                        if (oLstnr.onDetachFromLog) {
                            oLstnr.onDetachFromLog(oLog);
                        }
                        oListener.listeners.splice(i, 1);
                        return;
                    }
                }
            }
        };
    }
    return oListener;
}
Log.fatal = function (sMessage, sDetails, sComponent, fnSupportInfo) {
    log(Log.Level.FATAL, sMessage, sDetails, sComponent, fnSupportInfo);
};
Log.error = function (sMessage, sDetails, sComponent, fnSupportInfo) {
    log(Log.Level.ERROR, sMessage, sDetails, sComponent, fnSupportInfo);
};
Log.warning = function (sMessage, sDetails, sComponent, fnSupportInfo) {
    log(Log.Level.WARNING, sMessage, sDetails, sComponent, fnSupportInfo);
};
Log.info = function (sMessage, sDetails, sComponent, fnSupportInfo) {
    log(Log.Level.INFO, sMessage, sDetails, sComponent, fnSupportInfo);
};
Log.debug = function (sMessage, sDetails, sComponent, fnSupportInfo) {
    log(Log.Level.DEBUG, sMessage, sDetails, sComponent, fnSupportInfo);
};
Log.trace = function (sMessage, sDetails, sComponent, fnSupportInfo) {
    log(Log.Level.TRACE, sMessage, sDetails, sComponent, fnSupportInfo);
};
Log.setLevel = function (iLogLevel, sComponent, _bDefault) {
    sComponent = sComponent || sDefaultComponent || '';
    if (!_bDefault || mMaxLevel[sComponent] == null) {
        mMaxLevel[sComponent] = iLogLevel;
        var sLogLevel;
        Object.keys(Log.Level).forEach(function (sLevel) {
            if (Log.Level[sLevel] === iLogLevel) {
                sLogLevel = sLevel;
            }
        });
        log(Log.Level.INFO, 'Changing log level ' + (sComponent ? 'for \'' + sComponent + '\' ' : '') + 'to ' + sLogLevel, '', 'sap.base.log');
    }
};
Log.getLevel = function (sComponent) {
    return level(sComponent || sDefaultComponent);
};
Log.isLoggable = function (iLevel, sComponent) {
    return (iLevel == null ? Log.Level.DEBUG : iLevel) <= level(sComponent || sDefaultComponent);
};
Log.logSupportInfo = function (bEnabled) {
    bLogSupportInfo = bEnabled;
};
function log(iLevel, sMessage, sDetails, sComponent, fnSupportInfo) {
    if (!fnSupportInfo && !sComponent && typeof sDetails === 'function') {
        fnSupportInfo = sDetails;
        sDetails = '';
    }
    if (!fnSupportInfo && typeof sComponent === 'function') {
        fnSupportInfo = sComponent;
        sComponent = '';
    }
    sComponent = sComponent || sDefaultComponent;
    if (iLevel <= level(sComponent)) {
        var fNow = fnNow(), oNow = new Date(fNow), iMicroSeconds = Math.floor((fNow - Math.floor(fNow)) * 1000), oLogEntry = {
                time: pad0(oNow.getHours(), 2) + ':' + pad0(oNow.getMinutes(), 2) + ':' + pad0(oNow.getSeconds(), 2) + '.' + pad0(oNow.getMilliseconds(), 3) + pad0(iMicroSeconds, 3),
                date: pad0(oNow.getFullYear(), 4) + '-' + pad0(oNow.getMonth() + 1, 2) + '-' + pad0(oNow.getDate(), 2),
                timestamp: fNow,
                level: iLevel,
                message: String(sMessage || ''),
                details: String(sDetails || ''),
                component: String(sComponent || '')
            };
        if (bLogSupportInfo && typeof fnSupportInfo === 'function') {
            oLogEntry.supportInfo = fnSupportInfo();
        }
        aLog.push(oLogEntry);
        if (oListener) {
            oListener.onLogEntry(oLogEntry);
        }
        if (console) {
            var logText = oLogEntry.date + ' ' + oLogEntry.time + ' ' + oLogEntry.message + ' - ' + oLogEntry.details + ' ' + oLogEntry.component;
            switch (iLevel) {
            case Log.Level.FATAL:
            case Log.Level.ERROR:
                console.error(logText);
                break;
            case Log.Level.WARNING:
                console.warn(logText);
                break;
            case Log.Level.INFO:
                console.info ? console.info(logText) : console.log(logText);
                break;
            case Log.Level.DEBUG:
                console.debug ? console.debug(logText) : console.log(logText);
                break;
            case Log.Level.TRACE:
                console.trace ? console.trace(logText) : console.log(logText);
                break;
            }
            if (console.info && oLogEntry.supportInfo) {
                console.info(oLogEntry.supportInfo);
            }
        }
        return oLogEntry;
    }
}
Log.getLogEntries = function () {
    return aLog.slice();
};
Log.addLogListener = function (oListener) {
    getLogEntryListenerInstance().attach(this, oListener);
};
Log.removeLogListener = function (oListener) {
    getLogEntryListenerInstance().detach(this, oListener);
};
function Logger(sComponent) {
    this.fatal = function (msg, detail, comp, support) {
        Log.fatal(msg, detail, comp || sComponent, support);
        return this;
    };
    this.error = function (msg, detail, comp, support) {
        Log.error(msg, detail, comp || sComponent, support);
        return this;
    };
    this.warning = function (msg, detail, comp, support) {
        Log.warning(msg, detail, comp || sComponent, support);
        return this;
    };
    this.info = function (msg, detail, comp, support) {
        Log.info(msg, detail, comp || sComponent, support);
        return this;
    };
    this.debug = function (msg, detail, comp, support) {
        Log.debug(msg, detail, comp || sComponent, support);
        return this;
    };
    this.trace = function (msg, detail, comp, support) {
        Log.trace(msg, detail, comp || sComponent, support);
        return this;
    };
    this.setLevel = function (level, comp) {
        Log.setLevel(level, comp || sComponent);
        return this;
    };
    this.getLevel = function (comp) {
        return Log.getLevel(comp || sComponent);
    };
    this.isLoggable = function (level, comp) {
        return Log.isLoggable(level, comp || sComponent);
    };
}
Log.getLogger = function (sComponent, iDefaultLogLevel) {
    if (!isNaN(iDefaultLogLevel) && mMaxLevel[sComponent] == null) {
        mMaxLevel[sComponent] = iDefaultLogLevel;
    }
    return new Logger(sComponent);
};

var fnAssert = function (bResult, vMessage) {
    if (!bResult) {
        var sMessage = typeof vMessage === 'function' ? vMessage() : vMessage;
        if (console && console.assert) {
            console.assert(bResult, sMessage);
        } else {
            Log.debug('[Assertions] ' + sMessage);
        }
    }
};

var rMessageFormat = /('')|'([^']+(?:''[^']*)*)(?:'|$)|\{([0-9]+(?:\s*,[^{}]*)?)\}|[{}]/g;
var fnFormatMessage = function (sPattern, aValues) {
    fnAssert(typeof sPattern === 'string' || sPattern instanceof String, 'pattern must be string');
    if (arguments.length > 2 || aValues != null && !Array.isArray(aValues)) {
        aValues = Array.prototype.slice.call(arguments, 1);
    }
    aValues = aValues || [];
    return sPattern.replace(rMessageFormat, function ($0, $1, $2, $3, offset) {
        if ($1) {
            return '\'';
        } else if ($2) {
            return $2.replace(/''/g, '\'');
        } else if ($3) {
            return String(aValues[parseInt($3)]);
        }
        throw new Error('formatMessage: pattern syntax error at pos. ' + offset);
    });
};

var LoaderExtensions = {};
var FRAGMENT = 'fragment';
var VIEW = 'view';
var KNOWN_SUBTYPES = {
    js: [
        VIEW,
        FRAGMENT,
        'controller',
        'designtime'
    ],
    xml: [
        VIEW,
        FRAGMENT
    ],
    json: [
        VIEW,
        FRAGMENT
    ],
    html: [
        VIEW,
        FRAGMENT
    ]
};
var rTypes;
(function () {
    var s = '';
    for (var sType in KNOWN_SUBTYPES) {
        s = (s ? s + '|' : '') + sType;
    }
    s = '\\.(' + s + ')$';
    rTypes = new RegExp(s);
}());
LoaderExtensions.getKnownSubtypes = function () {
    return KNOWN_SUBTYPES;
};
LoaderExtensions.getAllRequiredModules = function () {
    var aModuleNames = [], mModules = sap.ui.loader._.getAllModules(true), oModule;
    for (var sModuleName in mModules) {
        oModule = mModules[sModuleName];
        if (oModule.ui5 && oModule.state !== -1) {
            aModuleNames.push(oModule.ui5);
        }
    }
    return aModuleNames;
};
LoaderExtensions.loadResource = function (sResourceName, mOptions) {
    var sType, oData, sUrl, oError, oDeferred, iSyncCallBehavior;
    if (typeof sResourceName === 'string') {
        mOptions = mOptions || {};
    } else {
        mOptions = sResourceName || {};
        sResourceName = mOptions.name;
    }
    mOptions = jQuery.extend({
        failOnError: true,
        async: false
    }, mOptions);
    sType = mOptions.dataType;
    if (sType == null && sResourceName) {
        sType = (sType = rTypes.exec(sResourceName || mOptions.url)) && sType[1];
    }
    fnAssert(/^(xml|html|json|text)$/.test(sType), 'type must be one of xml, html, json or text');
    oDeferred = mOptions.async ? new jQuery.Deferred() : null;
    function handleData(d, e) {
        if (d == null && mOptions.failOnError) {
            oError = e || new Error('no data returned for ' + sResourceName);
            if (mOptions.async) {
                oDeferred.reject(oError);
                Log.error(oError);
            }
            return null;
        }
        if (mOptions.async) {
            oDeferred.resolve(d);
        }
        return d;
    }
    function convertData(d) {
        var vConverter = jQuery.ajaxSettings.converters['text ' + sType];
        if (typeof vConverter === 'function') {
            d = vConverter(d);
        }
        return handleData(d);
    }
    oData = sap.ui.loader._.getModuleContent(sResourceName, mOptions.url);
    if (oData != undefined) {
        if (mOptions.async) {
            setTimeout(function () {
                convertData(oData);
            }, 0);
        } else {
            oData = convertData(oData);
        }
    } else {
        iSyncCallBehavior = sap.ui.loader._.getSyncCallBehavior();
        if (!mOptions.async && iSyncCallBehavior) {
            if (iSyncCallBehavior >= 1) {
                Log.error('[nosync] loading resource \'' + (sResourceName || mOptions.url) + '\' with sync XHR');
            } else {
                throw new Error('[nosync] loading resource \'' + (sResourceName || mOptions.url) + '\' with sync XHR');
            }
        }
        jQuery.ajax({
            url: sUrl = mOptions.url || sap.ui.loader._.getResourcePath(sResourceName),
            async: mOptions.async,
            dataType: sType,
            headers: mOptions.headers,
            success: function (data, textStatus, xhr) {
                oData = handleData(data);
            },
            error: function (xhr, textStatus, error) {
                oError = new Error('resource ' + sResourceName + ' could not be loaded from ' + sUrl + '. Check for \'file not found\' or parse errors. Reason: ' + error);
                oError.status = textStatus;
                oError.error = error;
                oError.statusCode = xhr.status;
                oData = handleData(null, oError);
            }
        });
    }
    if (mOptions.async) {
        return Promise.resolve(oDeferred);
    }
    if (oError != null && mOptions.failOnError) {
        throw oError;
    }
    return oData;
};

var Properties = function () {
    this.mProperties = {};
    this.aKeys = null;
};
Properties.prototype.getProperty = function (sKey, sDefaultValue) {
    var sValue = this.mProperties[sKey];
    if (typeof sValue == 'string') {
        return sValue;
    } else if (sDefaultValue) {
        return sDefaultValue;
    }
    return null;
};
Properties.prototype.getKeys = function () {
    return this.aKeys || (this.aKeys = Object.keys(this.mProperties));
};
Properties.prototype.setProperty = function (sKey, sValue) {
    if (typeof sValue != 'string') {
        return;
    }
    if (typeof this.mProperties[sKey] != 'string' && this.aKeys) {
        this.aKeys.push(String(sKey));
    }
    this.mProperties[sKey] = sValue;
};
Properties.prototype.clone = function () {
    var oClone = new Properties();
    oClone.mProperties = Object.assign({}, this.mProperties);
    return oClone;
};
var flatstr = typeof chrome === 'object' || typeof v8 === 'object' ? function (s, iConcatOps) {
    if (iConcatOps > 2 && 40 * iConcatOps > s.length) ;
    return s;
} : function (s) {
    return s;
};
var rLines = /(?:\r\n|\r|\n|^)[ \t\f]*/;
var rEscapesOrSeparator = /(\\u[0-9a-fA-F]{0,4})|(\\.)|(\\$)|([ \t\f]*[ \t\f:=][ \t\f]*)/g;
var rEscapes = /(\\u[0-9a-fA-F]{0,4})|(\\.)|(\\$)/g;
var mEscapes = {
    '\\f': '\f',
    '\\n': '\n',
    '\\r': '\r',
    '\\t': '\t'
};
function parse(sText, oProp) {
    var aLines = sText.split(rLines), sLine, rMatcher, sKey, sValue, i, m, iLastIndex, iConcatOps;
    function append(s) {
        if (sValue) {
            sValue = sValue + s;
            iConcatOps++;
        } else {
            sValue = s;
            iConcatOps = 0;
        }
    }
    oProp.mProperties = {};
    for (i = 0; i < aLines.length; i++) {
        sLine = aLines[i];
        if (sLine === '' || sLine.charAt(0) === '#' || sLine.charAt(0) === '!') {
            continue;
        }
        rMatcher = rEscapesOrSeparator;
        rMatcher.lastIndex = iLastIndex = 0;
        sKey = null;
        sValue = '';
        while ((m = rMatcher.exec(sLine)) !== null) {
            if (iLastIndex < m.index) {
                append(sLine.slice(iLastIndex, m.index));
            }
            iLastIndex = rMatcher.lastIndex;
            if (m[1]) {
                if (m[1].length !== 6) {
                    throw new Error('Incomplete Unicode Escape \'' + m[1] + '\'');
                }
                append(String.fromCharCode(parseInt(m[1].slice(2), 16)));
            } else if (m[2]) {
                append(mEscapes[m[2]] || m[2].slice(1));
            } else if (m[3]) {
                sLine = aLines[++i];
                rMatcher.lastIndex = iLastIndex = 0;
            } else if (m[4]) {
                sKey = sValue;
                sValue = '';
                rMatcher = rEscapes;
                rMatcher.lastIndex = iLastIndex;
            }
        }
        if (iLastIndex < sLine.length) {
            append(sLine.slice(iLastIndex));
        }
        if (sKey == null) {
            sKey = sValue;
            sValue = '';
        }
        oProp.mProperties[sKey] = flatstr(sValue, sValue ? iConcatOps : 0);
    }
}
Properties.create = function (mParams) {
    mParams = Object.assign({
        url: undefined,
        headers: {}
    }, mParams);
    var bAsync = !!mParams.async, oProp = new Properties(), vResource;
    function _parse(sText) {
        if (typeof sText === 'string') {
            parse(sText, oProp);
            return oProp;
        }
        return mParams.returnNullIfMissing ? null : oProp;
    }
    if (typeof mParams.url === 'string') {
        vResource = LoaderExtensions.loadResource({
            url: mParams.url,
            dataType: 'text',
            headers: mParams.headers,
            failOnError: false,
            async: bAsync
        });
    }
    if (bAsync) {
        if (!vResource) {
            return Promise.resolve(_parse(null));
        }
        return vResource.then(function (oVal) {
            return _parse(oVal);
        }, function (oVal) {
            throw oVal instanceof Error ? oVal : new Error('Problem during loading of property file \'' + mParams.url + '\': ' + oVal);
        });
    }
    return _parse(vResource);
};

var rLocale$1 = /^((?:[A-Z]{2,3}(?:-[A-Z]{3}){0,3})|[A-Z]{4}|[A-Z]{5,8})(?:-([A-Z]{4}))?(?:-([A-Z]{2}|[0-9]{3}))?((?:-[0-9A-Z]{5,8}|-[0-9][0-9A-Z]{3})*)((?:-[0-9A-WYZ](?:-[0-9A-Z]{2,8})+)*)(?:-(X(?:-[0-9A-Z]{1,8})+))?$/i;
var M_ISO639_NEW_TO_OLD = {
    'he': 'iw',
    'yi': 'ji',
    'id': 'in',
    'sr': 'sh'
};
var M_ISO639_OLD_TO_NEW = {
    'iw': 'he',
    'ji': 'yi',
    'in': 'id',
    'sh': 'sr'
};
var M_SUPPORTABILITY_TO_XS = {
    'en_US_saptrc': '1Q',
    'en_US_sappsd': '2Q'
};
var rSAPSupportabilityLocales = /(?:^|-)(saptrc|sappsd)(?:-|$)/i;
function normalize(sLocale) {
    var m;
    if (typeof sLocale === 'string' && (m = rLocale$1.exec(sLocale.replace(/_/g, '-')))) {
        var sLanguage = m[1].toLowerCase();
        sLanguage = M_ISO639_NEW_TO_OLD[sLanguage] || sLanguage;
        var sScript = m[2] ? m[2].toLowerCase() : undefined;
        var sRegion = m[3] ? m[3].toUpperCase() : undefined;
        var sVariants = m[4] ? m[4].slice(1) : undefined;
        var sPrivate = m[6];
        if (sPrivate && (m = rSAPSupportabilityLocales.exec(sPrivate)) || sVariants && (m = rSAPSupportabilityLocales.exec(sVariants))) {
            return 'en_US_' + m[1].toLowerCase();
        }
        if (sLanguage === 'zh' && !sRegion) {
            if (sScript === 'hans') {
                sRegion = 'CN';
            } else if (sScript === 'hant') {
                sRegion = 'TW';
            }
        }
        return sLanguage + (sRegion ? '_' + sRegion + (sVariants ? '_' + sVariants.replace('-', '_') : '') : '');
    }
}
function defaultLocale() {
    var sLocale;
    if (window.sap && window.sap.ui && sap.ui.getWCCore) {
        sLocale = sap.ui.getWCCore().getConfiguration().getLanguage();
        sLocale = normalize(sLocale);
    }
    return sLocale || 'en';
}
function nextFallbackLocale(sLocale) {
    if (!sLocale) {
        return null;
    }
    if (sLocale === 'zh_HK') {
        return 'zh_TW';
    }
    var p = sLocale.lastIndexOf('_');
    if (p >= 0) {
        return sLocale.slice(0, p);
    }
    return sLocale !== 'en' ? 'en' : '';
}
function convertLocaleToBCP47(sLocale) {
    var m;
    if (typeof sLocale === 'string' && (m = rLocale$1.exec(sLocale.replace(/_/g, '-')))) {
        var sLanguage = m[1].toLowerCase();
        sLanguage = M_ISO639_OLD_TO_NEW[sLanguage] || sLanguage;
        return sLanguage + (m[3] ? '-' + m[3].toUpperCase() + (m[4] ? '-' + m[4].slice(1).replace('_', '-') : '') : '');
    }
}
var rUrl = /^((?:[^?#]*\/)?[^\/?#]*)(\.[^.\/?#]+)((?:\?([^#]*))?(?:#(.*))?)$/;
var A_VALID_FILE_TYPES = [
    '.properties',
    '.hdbtextbundle'
];
function splitUrl(sUrl) {
    var m = rUrl.exec(sUrl);
    if (!m || A_VALID_FILE_TYPES.indexOf(m[2]) < 0) {
        throw new Error('resource URL \'' + sUrl + '\' has unknown type (should be one of ' + A_VALID_FILE_TYPES.join(',') + ')');
    }
    return {
        url: sUrl,
        prefix: m[1],
        ext: m[2],
        query: m[4],
        hash: m[5] || '',
        suffix: m[2] + (m[3] || '')
    };
}
function ResourceBundle(sUrl, sLocale, bIncludeInfo, bAsync) {
    this.sLocale = this._sNextLocale = normalize(sLocale) || defaultLocale();
    this.oUrlInfo = splitUrl(sUrl);
    this.bIncludeInfo = bIncludeInfo;
    this.aCustomBundles = [];
    this.aPropertyFiles = [];
    this.aLocales = [];
    if (bAsync) {
        var resolveWithThis = function () {
            return this;
        }.bind(this);
        return loadNextPropertiesAsync(this).then(resolveWithThis, resolveWithThis);
    }
    loadNextPropertiesSync(this);
}
ResourceBundle.prototype._enhance = function (oCustomBundle) {
    if (oCustomBundle instanceof ResourceBundle) {
        this.aCustomBundles.push(oCustomBundle);
    } else {
        Log.error('Custom resource bundle is either undefined or not an instanceof sap/base/i18n/ResourceBundle. Therefore this custom resource bundle will be ignored!');
    }
};
ResourceBundle.prototype.getText = function (sKey, aArgs, bIgnoreKeyFallback) {
    var sValue = this._getTextFromProperties(sKey, aArgs);
    if (sValue != null) {
        return sValue;
    }
    sValue = this._getTextFromFallback(sKey, aArgs);
    if (sValue != null) {
        return sValue;
    }
    fnAssert(false, 'could not find any translatable text for key \'' + sKey + '\' in bundle \'' + this.oUrlInfo.url + '\'');
    if (bIgnoreKeyFallback) {
        return undefined;
    } else {
        return this._formatValue(sKey, sKey, aArgs);
    }
};
ResourceBundle.prototype._formatValue = function (sValue, sKey, aArgs) {
    if (typeof sValue === 'string') {
        if (aArgs) {
            sValue = fnFormatMessage(sValue, aArgs);
        }
        if (this.bIncludeInfo) {
            sValue = new String(sValue);
            sValue.originInfo = {
                source: 'Resource Bundle',
                url: this.oUrlInfo.url,
                locale: this.sLocale,
                key: sKey
            };
        }
    }
    return sValue;
};
ResourceBundle.prototype._getTextFromFallback = function (sKey, aArgs) {
    var sValue, i;
    for (i = this.aCustomBundles.length - 1; i >= 0; i--) {
        sValue = this.aCustomBundles[i]._getTextFromFallback(sKey, aArgs);
        if (sValue != null) {
            return sValue;
        }
    }
    while (typeof sValue !== 'string' && this._sNextLocale != null) {
        var oProperties = loadNextPropertiesSync(this);
        if (oProperties) {
            sValue = oProperties.getProperty(sKey);
            if (typeof sValue === 'string') {
                return this._formatValue(sValue, sKey, aArgs);
            }
        }
    }
    return null;
};
ResourceBundle.prototype._getTextFromProperties = function (sKey, aArgs) {
    var sValue = null, i;
    for (i = this.aCustomBundles.length - 1; i >= 0; i--) {
        sValue = this.aCustomBundles[i]._getTextFromProperties(sKey, aArgs);
        if (sValue != null) {
            return sValue;
        }
    }
    for (i = 0; i < this.aPropertyFiles.length; i++) {
        sValue = this.aPropertyFiles[i].getProperty(sKey);
        if (typeof sValue === 'string') {
            return this._formatValue(sValue, sKey, aArgs);
        }
    }
    return null;
};
ResourceBundle.prototype.hasText = function (sKey) {
    return this.aPropertyFiles.length > 0 && typeof this.aPropertyFiles[0].getProperty(sKey) === 'string';
};
function loadNextPropertiesAsync(oBundle) {
    if (oBundle._sNextLocale != null) {
        return tryToLoadNextProperties(oBundle, true).then(function (oProps) {
            return oProps || loadNextPropertiesAsync(oBundle);
        });
    }
    return Promise.resolve(null);
}
function loadNextPropertiesSync(oBundle) {
    while (oBundle._sNextLocale != null) {
        var oProps = tryToLoadNextProperties(oBundle, false);
        if (oProps) {
            return oProps;
        }
    }
    return null;
}
function isSupported(sLocale, aSupportedLocales) {
    return !aSupportedLocales || aSupportedLocales.length === 0 || aSupportedLocales.indexOf(sLocale) >= 0;
}
function tryToLoadNextProperties(oBundle, bAsync) {
    var sLocale = oBundle._sNextLocale;
    oBundle._sNextLocale = nextFallbackLocale(sLocale);
    var aSupportedLanguages = window.sap && window.sap.ui && sap.ui.getWCCore && sap.ui.getWCCore().getConfiguration().getSupportedLanguages();
    if (sLocale != null && isSupported(sLocale, aSupportedLanguages)) {
        var oUrl = oBundle.oUrlInfo, sUrl, mHeaders;
        if (oUrl.ext === '.hdbtextbundle') {
            if (M_SUPPORTABILITY_TO_XS[sLocale]) {
                sUrl = oUrl.prefix + oUrl.suffix + '?' + (oUrl.query ? oUrl.query + '&' : '') + 'sap-language=' + M_SUPPORTABILITY_TO_XS[sLocale] + (oUrl.hash ? '#' + oUrl.hash : '');
            } else {
                sUrl = oUrl.url;
            }
            mHeaders = { 'Accept-Language': convertLocaleToBCP47(sLocale) || '' };
        } else {
            sUrl = oUrl.prefix + (sLocale ? '_' + sLocale : '') + oUrl.suffix;
        }
        var vProperties = Properties.create({
            url: sUrl,
            headers: mHeaders,
            async: !!bAsync,
            returnNullIfMissing: true
        });
        var addProperties = function (oProps) {
            if (oProps) {
                oBundle.aPropertyFiles.push(oProps);
                oBundle.aLocales.push(sLocale);
            }
            return oProps;
        };
        return bAsync ? vProperties.then(addProperties) : addProperties(vProperties);
    }
    return bAsync ? Promise.resolve(null) : null;
}
ResourceBundle.create = function (mParams) {
    mParams = Object.assign({
        url: '',
        locale: undefined,
        includeInfo: false
    }, mParams);
    return new ResourceBundle(mParams.url, mParams.locale, mParams.includeInfo, !!mParams.async);
};
ResourceBundle._getFallbackLocales = function (sLocale, aSupportedLocales) {
    var sTempLocale = normalize(sLocale), aLocales = [];
    while (sTempLocale != null) {
        if (isSupported(sTempLocale, aSupportedLocales)) {
            aLocales.push(sTempLocale);
        }
        sTempLocale = nextFallbackLocale(sTempLocale);
    }
    return aLocales;
};
ResourceBundle.__normalize = normalize;
ResourceBundle.__nextFallbackLocale = nextFallbackLocale;

/* global sap */

const resources = new Map();

// date formatters from the core do not know about this new mechanism of fetching assets,
// but we can use the sap.ui.loader._.getModuleContent as a hook and provide the preloaded data,
// so that a sync request via jQuery is never triggered.
window.sap = window.sap || {};
window.sap.ui = window.sap.ui || {};

sap.ui.loader = sap.ui.loader || {};
sap.ui.loader._ = sap.ui.loader._ || {};
const getModulecontentOrig = sap.ui.loader._.getModuleContent;

sap.ui.loader._.getModuleContent = (moduleName, url) => {
	const customContent = resources.get(moduleName) || resources.get(url);

	if (customContent) {
		return customContent;
	}
	if (getModulecontentOrig) {
		return getModulecontentOrig(moduleName, url);
	}

	const missingModule = moduleName.match(/sap\/ui\/core\/cldr\/(\w+)\.json/);

	if (missingModule) {
		throw new Error(`CLDR data for locale ${missingModule[1]} is not loaded!`);
	}

	return "";
};

const registerModuleContent = (moduleName, content) => {
	resources.set(moduleName, content);
};

const bundleURLs = new Map();

/**
 * This method preforms the asyncronous task of fething the actual text resources. It will fetch
 * each text resource over the network once (even for multiple calls to the same method).
 * It should be fully finished before the ResourceBundle class is created in the webcomponents.
 * This method uses the bundle URLs that are populated by the <code>registerMessageBundles</code> method.
 * To simplify the usage, the synchronization of both methods happens internally for the same <code>packageId</code>
 * @param {packageId} packageId the node project package id
 * @public
 */
const fetchResourceBundle = async packageId => {
	const bundlesForPackage = bundleURLs.get(packageId);

	if (!bundlesForPackage) {
		console.warn(`Message bundle assets are not configured. Falling back to english texts.`, /* eslint-disable-line */
		` You need to import @ui5/webcomponents/dist/MessageBundleAssets.js with a build tool that supports JSON imports.`); /* eslint-disable-line */
		return;
	}

	const language = getLanguage$1();

	let localeId = ResourceBundle.__normalize(language);
	while (!bundlesForPackage[localeId]) {
		localeId = ResourceBundle.__nextFallbackLocale(localeId);
	}

	const bundleURL = bundlesForPackage[localeId];

	if (typeof bundleURL === "object") {
		// inlined from build
		registerModuleContent(`${packageId}_${localeId}.properties`, bundleURL._);
		return bundleURL;
	}

	const data = await fetchJsonOnce(bundleURL);
	registerModuleContent(`${packageId}_${localeId}.properties`, data._);
};

/**
 * Registers a map of locale/url information to be used by the <code>fetchResourceBundle</code> method.
 * @param {string} packageId the node project id of the prohject that provides text resources
 * @param {Object} bundlesMap an object with string locales as keys and the URLs of where the corresponding locale can be fetched from.
 * @public
 */
const registerMessageBundles = (packageId, bundlesMap) => {
	bundleURLs.set(packageId, bundlesMap);
};

class ResourceBundleFallback {
	getText(textObj, ...params) {
		return fnFormatMessage(textObj.defaultText, params);
	}
}

class ResourceBundleWrapper {
	constructor(resouceBundle) {
		this._resourceBundle = resouceBundle;
	}

	getText(textObj, ...params) {
		return this._resourceBundle.getText(textObj.key, ...params);
	}
}

const getResourceBundle = packageId => {
	const bundleLoaded = bundleURLs.has(packageId);

	if (bundleLoaded) {
		return new ResourceBundleWrapper(ResourceBundle.create({
			url: `${packageId}.properties`,
		}));
	}

	return new ResourceBundleFallback();
};

var ar = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_ar.06fb918541d68ed5.json";

var bg = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_bg.a778fe1b25159342.json";

var ca = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_ca.6a38d82dabbc5c30.json";

var cs = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_cs.81d0171bc73a68d8.json";

var da = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_da.40b3bf8df26ea945.json";

var de = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_de.003a88af11495a15.json";

var el = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_el.f468c1f6c90edc73.json";

var enUSSappsd = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_en_US_sappsd.0dce4b939c54cfc4.json";

var enUSSaptrc = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_en_US_saptrc.9bc9aa064bc6ecc9.json";

var en = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_en.d59172246398cc8f.json";

var es = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_es.ab14d7ce0bf66489.json";

var et = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_et.0c90feb1671ba0ea.json";

var fi = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_fi.6e6dd51450619a06.json";

var fr = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_fr.88b269c5ba9527a8.json";

var hi = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_hi.d46c1048011a0893.json";

var hr = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_hr.cb7f51997b3ec4a2.json";

var hu = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_hu.47c1cfab11f3d193.json";

var it = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_it.250799d07e0852c7.json";

var iw = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_iw.dba6f047c549ee52.json";

var ja = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_ja.a229dfa02de2c0c2.json";

var kk = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_kk.f3102b0950a1b903.json";

var ko = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_ko.22fe17aebe7281f4.json";

var lt = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_lt.5685ac52a3287bc2.json";

var lv = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_lv.cb22b4a4f0537065.json";

var ms = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_ms.84e52d85fd343d4c.json";

var nl = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_nl.b7234dc65f8384a5.json";

var no = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_no.aa766b01d5dd3397.json";

var pl = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_pl.ad6b8bb7568ceb62.json";

var pt = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_pt.3c37822285c202de.json";

var ro = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_ro.c602aaf73a74bf18.json";

var ru = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_ru.3ac41f7b4beecd72.json";

var sh = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_sh.421df84970edef89.json";

var sk = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_sk.f608bb74df0c4a5d.json";

var sl = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_sl.9450c227e6838ee7.json";

var sv = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_sv.e5747a02932a925b.json";

var th = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_th.3437d04f5056a409.json";

var tr = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_tr.89bc04dd14cf4660.json";

var uk = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_uk.0aa615d9445f9660.json";

var vi = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_vi.073f6383d6d10694.json";

var zhCN = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_zh_CN.9abbfdb97879f9b0.json";

var zhTW = "/i18n-demo/resources/sap/ui/webcomponents/main/messagebundle_zh_TW.9ab7f263087768f7.json";

const bundleMap = {
	ar,
	bg,
	ca,
	cs,
	da,
	de,
	el,
	en_US_sappsd: enUSSappsd,
	en_US_saptrc: enUSSaptrc,
	en,
	es,
	et,
	fi,
	fr,
	hi,
	hr,
	hu,
	it,
	iw,
	ja,
	kk,
	ko,
	lt,
	lv,
	ms,
	nl,
	no,
	pl,
	pt,
	ro,
	ru,
	sh,
	sk,
	sl,
	sv,
	th,
	tr,
	uk,
	vi,
	zh_CN: zhCN,
	zh_TW: zhTW,
};

const allEntriesInlined = Object.entries(bundleMap).every(([_key, value]) => typeof (value) === "object");

/* eslint-disable */
if (allEntriesInlined) {
	console.warn(`Inefficient bundling detected: consider bundling i18n imports as URLs instead of inlining them. 
See rollup-plugin-url or webpack file-loader for more information.
Suggested pattern: "i18n\\\/.*\\\.json"`);
}
/* eslint-enable */

registerMessageBundles("@ui5/webcomponents", bundleMap);

var BaseObject;
var Interface = function (oObject, aMethods, bFacade) {
  if (!oObject) {
    return oObject;
  }
  BaseObject = BaseObject || sap.ui.requireSync("sap/ui/base/Object");
  function fCreateDelegator(oObject, sMethodName) {
    return function () {
      var tmp = oObject[sMethodName].apply(oObject, arguments);
      if (bFacade) {
        return this;
      } else {
        return tmp instanceof BaseObject ? tmp.getInterface() : tmp;
      }
    };
  }
  if (!aMethods) {
    return {};
  }
  var sMethodName;
  for (var i = 0, ml = aMethods.length; i < ml; i++) {
    sMethodName = aMethods[i];
    if (!oObject[sMethodName] || typeof oObject[sMethodName] === "function") {
      this[sMethodName] = fCreateDelegator(oObject, sMethodName);
    }
  }
};

var ObjectPath = {};
var defaultRootContext = window;
function getObjectPathArray(vObjectPath) {
  return Array.isArray(vObjectPath) ? vObjectPath : vObjectPath.split(".");
}
ObjectPath.create = function (vObjectPath, oRootContext) {
  var oObject = oRootContext || defaultRootContext;
  var aNames = getObjectPathArray(vObjectPath);
  for (var i = 0; i < aNames.length; i++) {
    var sName = aNames[i];
    if (oObject[sName] === null || oObject[sName] !== undefined && (typeof oObject[sName] !== "object" && typeof oObject[sName] !== "function")) {
      throw new Error("Could not set object-path for '" + aNames.join(".") + "', path segment '" + sName + "' already exists.");
    }
    oObject[sName] = oObject[sName] || ({});
    oObject = oObject[sName];
  }
  return oObject;
};
ObjectPath.get = function (vObjectPath, oRootContext) {
  var oObject = oRootContext || defaultRootContext;
  var aNames = getObjectPathArray(vObjectPath);
  var sPropertyName = aNames.pop();
  for (var i = 0; i < aNames.length && oObject; i++) {
    oObject = oObject[aNames[i]];
  }
  return oObject ? oObject[sPropertyName] : undefined;
};
ObjectPath.set = function (vObjectPath, vValue, oRootContext) {
  oRootContext = oRootContext || defaultRootContext;
  var aNames = getObjectPathArray(vObjectPath);
  var sPropertyName = aNames.pop();
  var oObject = ObjectPath.create(aNames, oRootContext);
  oObject[sPropertyName] = vValue;
};

var fnUniqueSort = function (aArray) {
    fnAssert(aArray instanceof Array, 'uniqueSort: input parameter must be an Array');
    var l = aArray.length;
    if (l > 1) {
        aArray.sort();
        var j = 0;
        for (var i = 1; i < l; i++) {
            if (aArray[i] !== aArray[j]) {
                aArray[++j] = aArray[i];
            }
        }
        if (++j < l) {
            aArray.splice(j, l - j);
        }
    }
    return aArray;
};

var Metadata = function (sClassName, oClassInfo) {
    fnAssert(typeof sClassName === 'string' && sClassName, 'Metadata: sClassName must be a non-empty string');
    fnAssert(typeof oClassInfo === 'object', 'Metadata: oClassInfo must be empty or an object');
    if (!oClassInfo || typeof oClassInfo.metadata !== 'object') {
        oClassInfo = {
            metadata: oClassInfo || {},
            constructor: ObjectPath.get(sClassName)
        };
        oClassInfo.metadata.__version = 1;
    }
    oClassInfo.metadata.__version = oClassInfo.metadata.__version || 2;
    if (typeof oClassInfo.constructor !== 'function') {
        throw Error('constructor for class ' + sClassName + ' must have been declared before creating metadata for it');
    }
    this._sClassName = sClassName;
    this._oClass = oClassInfo.constructor;
    this.extend(oClassInfo);
};
Metadata.prototype.extend = function (oClassInfo) {
    this.applySettings(oClassInfo);
    this.afterApplySettings();
};
Metadata.prototype.applySettings = function (oClassInfo) {
    var that = this, oStaticInfo = oClassInfo.metadata, oPrototype;
    if (oStaticInfo.baseType) {
        var oParentClass = ObjectPath.get(oStaticInfo.baseType);
        if (typeof oParentClass !== 'function') {
            Log.fatal('base class \'' + oStaticInfo.baseType + '\' does not exist');
        }
        if (oParentClass.getMetadata) {
            this._oParent = oParentClass.getMetadata();
            fnAssert(oParentClass === oParentClass.getMetadata().getClass(), 'Metadata: oParentClass must match the class in the parent metadata');
        } else {
            this._oParent = new Metadata(oStaticInfo.baseType, {});
        }
    } else {
        this._oParent = undefined;
    }
    this._bAbstract = !!oStaticInfo['abstract'];
    this._bFinal = !!oStaticInfo['final'];
    this._sStereotype = oStaticInfo.stereotype || (this._oParent ? this._oParent._sStereotype : 'object');
    this._bDeprecated = !!oStaticInfo['deprecated'];
    this._aInterfaces = oStaticInfo.interfaces || [];
    this._aPublicMethods = oStaticInfo.publicMethods || [];
    this._bInterfacesUnique = false;
    oPrototype = this._oClass.prototype;
    for (var n in oClassInfo) {
        if (n !== 'metadata' && n !== 'constructor') {
            oPrototype[n] = oClassInfo[n];
            if (!n.match(/^_|^on|^init$|^exit$/)) {
                that._aPublicMethods.push(n);
            }
        }
    }
};
Metadata.prototype.afterApplySettings = function () {
    if (this._oParent) {
        this._aAllPublicMethods = this._oParent._aAllPublicMethods.concat(this._aPublicMethods);
        this._bInterfacesUnique = false;
    } else {
        this._aAllPublicMethods = this._aPublicMethods;
    }
};
Metadata.prototype.getStereotype = function () {
    return this._sStereotype;
};
Metadata.prototype.getName = function () {
    return this._sClassName;
};
Metadata.prototype.getClass = function () {
    return this._oClass;
};
Metadata.prototype.getParent = function () {
    return this._oParent;
};
Metadata.prototype._dedupInterfaces = function () {
    if (!this._bInterfacesUnique) {
        fnUniqueSort(this._aInterfaces);
        fnUniqueSort(this._aPublicMethods);
        fnUniqueSort(this._aAllPublicMethods);
        this._bInterfacesUnique = true;
    }
};
Metadata.prototype.getPublicMethods = function () {
    this._dedupInterfaces();
    return this._aPublicMethods;
};
Metadata.prototype.getAllPublicMethods = function () {
    this._dedupInterfaces();
    return this._aAllPublicMethods;
};
Metadata.prototype.getInterfaces = function () {
    this._dedupInterfaces();
    return this._aInterfaces;
};
Metadata.prototype.isInstanceOf = function (sInterface) {
    if (this._oParent) {
        if (this._oParent.isInstanceOf(sInterface)) {
            return true;
        }
    }
    var a = this._aInterfaces;
    for (var i = 0, l = a.length; i < l; i++) {
        if (a[i] === sInterface) {
            return true;
        }
    }
    return false;
};
var WRITABLE_IFF_PHANTOM = false;
Object.defineProperty(Metadata.prototype, '_mImplementedTypes', {
    get: function () {
        if (this === Metadata.prototype) {
            throw new Error('sap.ui.base.Metadata: The \'_mImplementedTypes\' property must not be accessed on the prototype');
        }
        var result = Object.create(this._oParent ? this._oParent._mImplementedTypes : null);
        result[this._sClassName] = true;
        var aInterfaces = this._aInterfaces, i = aInterfaces.length;
        while (i-- > 0) {
            if (!result[aInterfaces[i]]) {
                result[aInterfaces[i]] = true;
            }
        }
        Object.defineProperty(this, '_mImplementedTypes', {
            value: Object.freeze(result),
            writable: WRITABLE_IFF_PHANTOM,
            configurable: false
        });
        return result;
    },
    configurable: true
});
Metadata.prototype.isA = function (vTypeName) {
    var mTypes = this._mImplementedTypes;
    if (Array.isArray(vTypeName)) {
        for (var i = 0; i < vTypeName.length; i++) {
            if (vTypeName[i] in mTypes) {
                return true;
            }
        }
        return false;
    }
    return vTypeName in mTypes;
};
Metadata.prototype.isAbstract = function () {
    return this._bAbstract;
};
Metadata.prototype.isFinal = function () {
    return this._bFinal;
};
Metadata.prototype.isDeprecated = function () {
    return this._bDeprecated;
};
Metadata.prototype.addPublicMethods = function (sMethod) {
    var aNames = sMethod instanceof Array ? sMethod : arguments;
    Array.prototype.push.apply(this._aPublicMethods, aNames);
    Array.prototype.push.apply(this._aAllPublicMethods, aNames);
    this._bInterfacesUnique = false;
};
Metadata.createClass = function (fnBaseClass, sClassName, oClassInfo, FNMetaImpl) {
    if (typeof fnBaseClass === 'string') {
        FNMetaImpl = oClassInfo;
        oClassInfo = sClassName;
        sClassName = fnBaseClass;
        fnBaseClass = null;
    }
    fnAssert(!fnBaseClass || typeof fnBaseClass === 'function');
    fnAssert(typeof sClassName === 'string' && !!sClassName);
    fnAssert(!oClassInfo || typeof oClassInfo === 'object');
    fnAssert(!FNMetaImpl || typeof FNMetaImpl === 'function');
    FNMetaImpl = FNMetaImpl || Metadata;
    if (typeof FNMetaImpl.preprocessClassInfo === 'function') {
        oClassInfo = FNMetaImpl.preprocessClassInfo(oClassInfo);
    }
    oClassInfo = oClassInfo || {};
    oClassInfo.metadata = oClassInfo.metadata || {};
    if (!oClassInfo.hasOwnProperty('constructor')) {
        oClassInfo.constructor = undefined;
    }
    var fnClass = oClassInfo.constructor;
    fnAssert(!fnClass || typeof fnClass === 'function');
    if (fnBaseClass) {
        if (!fnClass) {
            if (oClassInfo.metadata.deprecated) {
                fnClass = function () {
                    Log.warning('Usage of deprecated class: ' + sClassName);
                    fnBaseClass.apply(this, arguments);
                };
            } else {
                fnClass = function () {
                    fnBaseClass.apply(this, arguments);
                };
            }
        }
        fnClass.prototype = Object.create(fnBaseClass.prototype);
        fnClass.prototype.constructor = fnClass;
        oClassInfo.metadata.baseType = fnBaseClass.getMetadata().getName();
    } else {
        fnClass = fnClass || function () {
        };
        delete oClassInfo.metadata.baseType;
    }
    oClassInfo.constructor = fnClass;
    ObjectPath.set(sClassName, fnClass);
    var oMetadata = new FNMetaImpl(sClassName, oClassInfo);
    fnClass.getMetadata = fnClass.prototype.getMetadata = function () {
        return oMetadata;
    };
    if (!fnClass.getMetadata().isFinal()) {
        fnClass.extend = function (sSCName, oSCClassInfo, fnSCMetaImpl) {
            return Metadata.createClass(fnClass, sSCName, oSCClassInfo, fnSCMetaImpl || FNMetaImpl);
        };
    }
    return fnClass;
};

var BaseObject$1 = Metadata.createClass('sap.ui.base.Object', {
    constructor: function () {
        if (!(this instanceof BaseObject$1)) {
            throw Error('Cannot instantiate object: "new" is missing!');
        }
    }
});
BaseObject$1.prototype.destroy = function () {
};
BaseObject$1.prototype.getInterface = function () {
    var oInterface = new Interface(this, this.getMetadata().getAllPublicMethods());
    this.getInterface = function () {
        return oInterface;
    };
    return oInterface;
};
BaseObject$1.defineClass = function (sClassName, oStaticInfo, FNMetaImpl) {
    var oMetadata = new (FNMetaImpl || Metadata)(sClassName, oStaticInfo);
    var fnClass = oMetadata.getClass();
    fnClass.getMetadata = fnClass.prototype.getMetadata = function () {
        return oMetadata;
    };
    if (!oMetadata.isFinal()) {
        fnClass.extend = function (sSCName, oSCClassInfo, fnSCMetaImpl) {
            return Metadata.createClass(fnClass, sSCName, oSCClassInfo, fnSCMetaImpl || FNMetaImpl);
        };
    }
    Log.debug('defined class \'' + sClassName + '\'' + (oMetadata.getParent() ? ' as subclass of ' + oMetadata.getParent().getName() : ''));
    return oMetadata;
};
BaseObject$1.prototype.isA = function (vTypeName) {
    return this.getMetadata().isA(vTypeName);
};
BaseObject$1.isA = function (oObject, vTypeName) {
    return oObject instanceof BaseObject$1 && oObject.isA(vTypeName);
};

var rLocale$2 = /^((?:[A-Z]{2,3}(?:-[A-Z]{3}){0,3})|[A-Z]{4}|[A-Z]{5,8})(?:-([A-Z]{4}))?(?:-([A-Z]{2}|[0-9]{3}))?((?:-[0-9A-Z]{5,8}|-[0-9][0-9A-Z]{3})*)((?:-[0-9A-WYZ](?:-[0-9A-Z]{2,8})+)*)(?:-(X(?:-[0-9A-Z]{1,8})+))?$/i;
var Locale$1 = BaseObject$1.extend('sap.ui.core.Locale', {
    constructor: function (sLocaleId) {
        BaseObject$1.apply(this);
        var aResult = rLocale$2.exec(sLocaleId.replace(/_/g, '-'));
        if (aResult === null) {
            throw 'The given language \'' + sLocaleId + '\' does not adhere to BCP-47.';
        }
        this.sLocaleId = sLocaleId;
        this.sLanguage = aResult[1] || null;
        this.sScript = aResult[2] || null;
        this.sRegion = aResult[3] || null;
        this.sVariant = aResult[4] && aResult[4].slice(1) || null;
        this.sExtension = aResult[5] && aResult[5].slice(1) || null;
        this.sPrivateUse = aResult[6] || null;
        if (this.sLanguage) {
            this.sLanguage = this.sLanguage.toLowerCase();
        }
        if (this.sScript) {
            this.sScript = this.sScript.toLowerCase().replace(/^[a-z]/, function ($) {
                return $.toUpperCase();
            });
        }
        if (this.sRegion) {
            this.sRegion = this.sRegion.toUpperCase();
        }
    },
    getLanguage: function () {
        return this.sLanguage;
    },
    getScript: function () {
        return this.sScript;
    },
    getRegion: function () {
        return this.sRegion;
    },
    getVariant: function () {
        return this.sVariant;
    },
    getVariantSubtags: function () {
        return this.sVariant ? this.sVariant.split('-') : [];
    },
    getExtension: function () {
        return this.sExtension;
    },
    getExtensionSubtags: function () {
        return this.sExtension ? this.sExtension.slice(2).split('-') : [];
    },
    getPrivateUse: function () {
        return this.sPrivateUse;
    },
    getPrivateUseSubtags: function () {
        return this.sPrivateUse ? this.sPrivateUse.slice(2).split('-') : [];
    },
    hasPrivateUseSubtag: function (sSubtag) {
        fnAssert(sSubtag && sSubtag.match(/^[0-9A-Z]{1,8}$/i), 'subtag must be a valid BCP47 private use tag');
        return this.getPrivateUseSubtags().indexOf(sSubtag) >= 0;
    },
    toString: function () {
        var r = [this.sLanguage];
        if (this.sScript) {
            r.push(this.sScript);
        }
        if (this.sRegion) {
            r.push(this.sRegion);
        }
        if (this.sVariant) {
            r.push(this.sVariant);
        }
        if (this.sExtension) {
            r.push(this.sExtension);
        }
        if (this.sPrivateUse) {
            r.push(this.sPrivateUse);
        }
        return r.join('-');
    },
    getSAPLogonLanguage: function () {
        var sLanguage = this.sLanguage || '', m;
        if (sLanguage.indexOf('-') >= 0) {
            sLanguage = sLanguage.slice(0, sLanguage.indexOf('-'));
        }
        sLanguage = M_ISO639_OLD_TO_NEW$1[sLanguage] || sLanguage;
        if (sLanguage === 'zh') {
            if (this.sScript === 'Hant' || !this.sScript && this.sRegion === 'TW') {
                sLanguage = 'zf';
            }
        }
        if (this.sPrivateUse && (m = /-(saptrc|sappsd)(?:-|$)/i.exec(this.sPrivateUse))) {
            sLanguage = m[1].toLowerCase() === 'saptrc' ? '1Q' : '2Q';
        }
        return sLanguage.toUpperCase();
    }
});
var M_ISO639_OLD_TO_NEW$1 = {
    'iw': 'he',
    'ji': 'yi',
    'in': 'id',
    'sh': 'sr'
};
function getDesigntimePropertyAsArray$1(sValue) {
    var m = /\$([-a-z0-9A-Z._]+)(?::([^$]*))?\$/.exec(sValue);
    return m && m[2] ? m[2].split(/,/) : null;
}
var A_RTL_LOCALES = getDesigntimePropertyAsArray$1('$cldr-rtl-locales:ar,fa,he$') || [];
Locale$1._cldrLocales = getDesigntimePropertyAsArray$1('$cldr-locales:ar,ar_EG,ar_SA,bg,br,ca,cs,da,de,de_AT,de_CH,el,el_CY,en,en_AU,en_GB,en_HK,en_IE,en_IN,en_NZ,en_PG,en_SG,en_ZA,es,es_AR,es_BO,es_CL,es_CO,es_MX,es_PE,es_UY,es_VE,et,fa,fi,fr,fr_BE,fr_CA,fr_CH,fr_LU,he,hi,hr,hu,id,it,it_CH,ja,kk,ko,lt,lv,ms,nb,nl,nl_BE,nn,pl,pt,pt_PT,ro,ru,ru_UA,sk,sl,sr,sv,th,tr,uk,vi,zh_CN,zh_HK,zh_SG,zh_TW$');
Locale$1._coreI18nLocales = getDesigntimePropertyAsArray$1('$core-i18n-locales:,ar,bg,ca,cs,da,de,el,en,es,et,fi,fr,hi,hr,hu,it,iw,ja,ko,lt,lv,nl,no,pl,pt,ro,ru,sh,sk,sl,sv,th,tr,uk,vi,zh_CN,zh_TW$');
Locale$1._impliesRTL = function (vLanguage) {
    var oLocale = vLanguage instanceof Locale$1 ? vLanguage : new Locale$1(vLanguage);
    var sLanguage = oLocale.getLanguage() || '';
    sLanguage = sLanguage && M_ISO639_OLD_TO_NEW$1[sLanguage] || sLanguage;
    var sRegion = oLocale.getRegion() || '';
    if (sRegion && A_RTL_LOCALES.indexOf(sLanguage + '_' + sRegion) >= 0) {
        return true;
    }
    return A_RTL_LOCALES.indexOf(sLanguage) >= 0;
};

var LocaleData = BaseObject$1.extend('sap.ui.core.LocaleData', {
    constructor: function (oLocale) {
        this.oLocale = oLocale;
        BaseObject$1.apply(this);
        this.mData = getData(oLocale);
    },
    _get: function () {
        return this._getDeep(this.mData, arguments);
    },
    _getMerged: function () {
        return this._get.apply(this, arguments);
    },
    _getDeep: function (oObject, aPropertyNames) {
        var oResult = oObject;
        for (var i = 0; i < aPropertyNames.length; i++) {
            oResult = oResult[aPropertyNames[i]];
            if (oResult === undefined) {
                break;
            }
        }
        return oResult;
    },
    getOrientation: function () {
        return this._get('orientation');
    },
    getLanguages: function () {
        return this._get('languages');
    },
    getScripts: function () {
        return this._get('scripts');
    },
    getTerritories: function () {
        return this._get('territories');
    },
    getMonths: function (sWidth, sCalendarType) {
        fnAssert(sWidth == 'narrow' || sWidth == 'abbreviated' || sWidth == 'wide', 'sWidth must be narrow, abbreviated or wide');
        return this._get(getCLDRCalendarName(sCalendarType), 'months', 'format', sWidth);
    },
    getMonthsStandAlone: function (sWidth, sCalendarType) {
        fnAssert(sWidth == 'narrow' || sWidth == 'abbreviated' || sWidth == 'wide', 'sWidth must be narrow, abbreviated or wide');
        return this._get(getCLDRCalendarName(sCalendarType), 'months', 'stand-alone', sWidth);
    },
    getDays: function (sWidth, sCalendarType) {
        fnAssert(sWidth == 'narrow' || sWidth == 'abbreviated' || sWidth == 'wide' || sWidth == 'short', 'sWidth must be narrow, abbreviate, wide or short');
        return this._get(getCLDRCalendarName(sCalendarType), 'days', 'format', sWidth);
    },
    getDaysStandAlone: function (sWidth, sCalendarType) {
        fnAssert(sWidth == 'narrow' || sWidth == 'abbreviated' || sWidth == 'wide' || sWidth == 'short', 'sWidth must be narrow, abbreviated, wide or short');
        return this._get(getCLDRCalendarName(sCalendarType), 'days', 'stand-alone', sWidth);
    },
    getQuarters: function (sWidth, sCalendarType) {
        fnAssert(sWidth == 'narrow' || sWidth == 'abbreviated' || sWidth == 'wide', 'sWidth must be narrow, abbreviated or wide');
        return this._get(getCLDRCalendarName(sCalendarType), 'quarters', 'format', sWidth);
    },
    getQuartersStandAlone: function (sWidth, sCalendarType) {
        fnAssert(sWidth == 'narrow' || sWidth == 'abbreviated' || sWidth == 'wide', 'sWidth must be narrow, abbreviated or wide');
        return this._get(getCLDRCalendarName(sCalendarType), 'quarters', 'stand-alone', sWidth);
    },
    getDayPeriods: function (sWidth, sCalendarType) {
        fnAssert(sWidth == 'narrow' || sWidth == 'abbreviated' || sWidth == 'wide', 'sWidth must be narrow, abbreviated or wide');
        return this._get(getCLDRCalendarName(sCalendarType), 'dayPeriods', 'format', sWidth);
    },
    getDayPeriodsStandAlone: function (sWidth, sCalendarType) {
        fnAssert(sWidth == 'narrow' || sWidth == 'abbreviated' || sWidth == 'wide', 'sWidth must be narrow, abbreviated or wide');
        return this._get(getCLDRCalendarName(sCalendarType), 'dayPeriods', 'stand-alone', sWidth);
    },
    getDatePattern: function (sStyle, sCalendarType) {
        fnAssert(sStyle == 'short' || sStyle == 'medium' || sStyle == 'long' || sStyle == 'full', 'sStyle must be short, medium, long or full');
        return this._get(getCLDRCalendarName(sCalendarType), 'dateFormats', sStyle);
    },
    getTimePattern: function (sStyle, sCalendarType) {
        fnAssert(sStyle == 'short' || sStyle == 'medium' || sStyle == 'long' || sStyle == 'full', 'sStyle must be short, medium, long or full');
        return this._get(getCLDRCalendarName(sCalendarType), 'timeFormats', sStyle);
    },
    getDateTimePattern: function (sStyle, sCalendarType) {
        fnAssert(sStyle == 'short' || sStyle == 'medium' || sStyle == 'long' || sStyle == 'full', 'sStyle must be short, medium, long or full');
        return this._get(getCLDRCalendarName(sCalendarType), 'dateTimeFormats', sStyle);
    },
    getCombinedDateTimePattern: function (sDateStyle, sTimeStyle, sCalendarType) {
        fnAssert(sDateStyle == 'short' || sDateStyle == 'medium' || sDateStyle == 'long' || sDateStyle == 'full', 'sStyle must be short, medium, long or full');
        fnAssert(sTimeStyle == 'short' || sTimeStyle == 'medium' || sTimeStyle == 'long' || sTimeStyle == 'full', 'sStyle must be short, medium, long or full');
        var sDateTimePattern = this.getDateTimePattern(sDateStyle, sCalendarType), sDatePattern = this.getDatePattern(sDateStyle, sCalendarType), sTimePattern = this.getTimePattern(sTimeStyle, sCalendarType);
        return sDateTimePattern.replace('{0}', sTimePattern).replace('{1}', sDatePattern);
    },
    getCustomDateTimePattern: function (sSkeleton, sCalendarType) {
        var oAvailableFormats = this._get(getCLDRCalendarName(sCalendarType), 'dateTimeFormats', 'availableFormats');
        return this._getFormatPattern(sSkeleton, oAvailableFormats, sCalendarType);
    },
    getIntervalPattern: function (sId, sCalendarType) {
        var oIntervalFormats = this._get(getCLDRCalendarName(sCalendarType), 'dateTimeFormats', 'intervalFormats'), aIdParts, sIntervalId, sDifference, oInterval, sPattern;
        if (sId) {
            aIdParts = sId.split('-');
            sIntervalId = aIdParts[0];
            sDifference = aIdParts[1];
            oInterval = oIntervalFormats[sIntervalId];
            if (oInterval) {
                sPattern = oInterval[sDifference];
                if (sPattern) {
                    return sPattern;
                }
            }
        }
        return oIntervalFormats.intervalFormatFallback;
    },
    getCombinedIntervalPattern: function (sPattern, sCalendarType) {
        var oIntervalFormats = this._get(getCLDRCalendarName(sCalendarType), 'dateTimeFormats', 'intervalFormats'), sFallbackPattern = oIntervalFormats.intervalFormatFallback;
        return sFallbackPattern.replace(/\{(0|1)\}/g, sPattern);
    },
    getCustomIntervalPattern: function (sSkeleton, vGreatestDiff, sCalendarType) {
        var oAvailableFormats = this._get(getCLDRCalendarName(sCalendarType), 'dateTimeFormats', 'intervalFormats');
        return this._getFormatPattern(sSkeleton, oAvailableFormats, sCalendarType, vGreatestDiff);
    },
    _getFormatPattern: function (sSkeleton, oAvailableFormats, sCalendarType, vDiff) {
        var vPattern, aPatterns, oIntervalFormats;
        if (!vDiff) {
            vPattern = oAvailableFormats[sSkeleton];
        } else if (typeof vDiff === 'string') {
            if (vDiff == 'j' || vDiff == 'J') {
                vDiff = this.getPreferredHourSymbol();
            }
            oIntervalFormats = oAvailableFormats[sSkeleton];
            vPattern = oIntervalFormats && oIntervalFormats[vDiff];
        }
        if (vPattern) {
            if (typeof vPattern === 'object') {
                aPatterns = Object.keys(vPattern).map(function (sKey) {
                    return vPattern[sKey];
                });
            } else {
                return vPattern;
            }
        }
        if (!aPatterns) {
            aPatterns = this._createFormatPattern(sSkeleton, oAvailableFormats, sCalendarType, vDiff);
        }
        if (aPatterns && aPatterns.length === 1) {
            return aPatterns[0];
        }
        return aPatterns;
    },
    _createFormatPattern: function (sSkeleton, oAvailableFormats, sCalendarType, vDiff) {
        var aTokens = this._parseSkeletonFormat(sSkeleton), aPatterns, oBestMatch = this._findBestMatch(aTokens, sSkeleton, oAvailableFormats), oToken, oAvailableDateTimeFormats, sPattern, sSinglePattern, sDiffSymbol, sDiffGroup, rMixedSkeleton = /^([GyYqQMLwWEecdD]+)([hHkKjJmszZvVOXx]+)$/, bSingleDate, i;
        if (vDiff) {
            if (typeof vDiff === 'string') {
                sDiffGroup = mCLDRSymbols[vDiff] ? mCLDRSymbols[vDiff].group : '';
                if (sDiffGroup) {
                    bSingleDate = mCLDRSymbolGroups[sDiffGroup].index > aTokens[aTokens.length - 1].index;
                }
                sDiffSymbol = vDiff;
            } else {
                bSingleDate = true;
                for (i = aTokens.length - 1; i >= 0; i--) {
                    oToken = aTokens[i];
                    if (vDiff[oToken.group]) {
                        bSingleDate = false;
                        break;
                    }
                }
                for (i = 0; i < aTokens.length; i++) {
                    oToken = aTokens[i];
                    if (vDiff[oToken.group]) {
                        sDiffSymbol = oToken.symbol;
                        break;
                    }
                }
                if ((sDiffSymbol == 'h' || sDiffSymbol == 'K') && vDiff.DayPeriod) {
                    sDiffSymbol = 'a';
                }
            }
            if (bSingleDate) {
                return [this.getCustomDateTimePattern(sSkeleton, sCalendarType)];
            }
            if (oBestMatch && oBestMatch.missingTokens.length === 0) {
                sPattern = oBestMatch.pattern[sDiffSymbol];
                if (sPattern && oBestMatch.distance > 0) {
                    sPattern = this._expandFields(sPattern, oBestMatch.patternTokens, aTokens);
                }
            }
            if (!sPattern) {
                oAvailableDateTimeFormats = this._get(getCLDRCalendarName(sCalendarType), 'dateTimeFormats', 'availableFormats');
                if (rMixedSkeleton.test(sSkeleton) && 'ahHkKjJms'.indexOf(sDiffSymbol) >= 0) {
                    sPattern = this._getMixedFormatPattern(sSkeleton, oAvailableDateTimeFormats, sCalendarType, vDiff);
                } else {
                    sSinglePattern = this._getFormatPattern(sSkeleton, oAvailableDateTimeFormats, sCalendarType);
                    sPattern = this.getCombinedIntervalPattern(sSinglePattern, sCalendarType);
                }
            }
            aPatterns = [sPattern];
        } else if (!oBestMatch) {
            sPattern = sSkeleton;
            aPatterns = [sPattern];
        } else {
            if (typeof oBestMatch.pattern === 'string') {
                aPatterns = [oBestMatch.pattern];
            } else if (typeof oBestMatch.pattern === 'object') {
                aPatterns = [];
                for (var sKey in oBestMatch.pattern) {
                    sPattern = oBestMatch.pattern[sKey];
                    aPatterns.push(sPattern);
                }
            }
            if (oBestMatch.distance > 0) {
                if (oBestMatch.missingTokens.length > 0) {
                    if (rMixedSkeleton.test(sSkeleton)) {
                        aPatterns = [this._getMixedFormatPattern(sSkeleton, oAvailableFormats, sCalendarType)];
                    } else {
                        aPatterns = this._expandFields(aPatterns, oBestMatch.patternTokens, aTokens);
                        aPatterns = this._appendItems(aPatterns, oBestMatch.missingTokens, sCalendarType);
                    }
                } else {
                    aPatterns = this._expandFields(aPatterns, oBestMatch.patternTokens, aTokens);
                }
            }
        }
        if (sSkeleton.indexOf('J') >= 0) {
            aPatterns.forEach(function (sPattern, iIndex) {
                aPatterns[iIndex] = sPattern.replace(/ ?[abB](?=([^']*'[^']*')*[^']*)$/g, '');
            });
        }
        return aPatterns;
    },
    _parseSkeletonFormat: function (sSkeleton) {
        var aTokens = [], oToken = { index: -1 }, sSymbol, oSymbol, oGroup;
        for (var i = 0; i < sSkeleton.length; i++) {
            sSymbol = sSkeleton.charAt(i);
            if (sSymbol == 'j' || sSymbol == 'J') {
                sSymbol = this.getPreferredHourSymbol();
            }
            if (sSymbol == oToken.symbol) {
                oToken.length++;
                continue;
            }
            oSymbol = mCLDRSymbols[sSymbol];
            oGroup = mCLDRSymbolGroups[oSymbol.group];
            if (oSymbol.group == 'Other' || oGroup.diffOnly) {
                throw new Error('Symbol \'' + sSymbol + '\' is not allowed in skeleton format \'' + sSkeleton + '\'');
            }
            if (oGroup.index <= oToken.index) {
                throw new Error('Symbol \'' + sSymbol + '\' at wrong position or duplicate in skeleton format \'' + sSkeleton + '\'');
            }
            oToken = {
                symbol: sSymbol,
                group: oSymbol.group,
                match: oSymbol.match,
                index: oGroup.index,
                field: oGroup.field,
                length: 1
            };
            aTokens.push(oToken);
        }
        return aTokens;
    },
    _findBestMatch: function (aTokens, sSkeleton, oAvailableFormats) {
        var aTestTokens, aMissingTokens, oToken, oTestToken, iTest, iDistance, bMatch, iFirstDiffPos, oTokenSymbol, oTestTokenSymbol, oBestMatch = {
                distance: 10000,
                firstDiffPos: -1
            };
        for (var sTestSkeleton in oAvailableFormats) {
            if (sTestSkeleton === 'intervalFormatFallback' || sTestSkeleton.indexOf('B') > -1) {
                continue;
            }
            aTestTokens = this._parseSkeletonFormat(sTestSkeleton);
            iDistance = 0;
            aMissingTokens = [];
            bMatch = true;
            if (aTokens.length < aTestTokens.length) {
                continue;
            }
            iTest = 0;
            iFirstDiffPos = aTokens.length;
            for (var i = 0; i < aTokens.length; i++) {
                oToken = aTokens[i];
                oTestToken = aTestTokens[iTest];
                if (iFirstDiffPos === aTokens.length) {
                    iFirstDiffPos = i;
                }
                if (oTestToken) {
                    oTokenSymbol = mCLDRSymbols[oToken.symbol];
                    oTestTokenSymbol = mCLDRSymbols[oTestToken.symbol];
                    if (oToken.symbol === oTestToken.symbol) {
                        if (oToken.length === oTestToken.length) {
                            if (iFirstDiffPos === i) {
                                iFirstDiffPos = aTokens.length;
                            }
                        } else {
                            if (oToken.length < oTokenSymbol.numericCeiling ? oTestToken.length < oTestTokenSymbol.numericCeiling : oTestToken.length >= oTestTokenSymbol.numericCeiling) {
                                iDistance += Math.abs(oToken.length - oTestToken.length);
                            } else {
                                iDistance += 5;
                            }
                        }
                        iTest++;
                        continue;
                    } else {
                        if (oToken.match == oTestToken.match) {
                            iDistance += Math.abs(oToken.length - oTestToken.length) + 10;
                            iTest++;
                            continue;
                        }
                    }
                }
                aMissingTokens.push(oToken);
                iDistance += 50 - i;
            }
            if (iTest < aTestTokens.length) {
                bMatch = false;
            }
            if (bMatch && (iDistance < oBestMatch.distance || iDistance === oBestMatch.distance && iFirstDiffPos > oBestMatch.firstDiffPos)) {
                oBestMatch.distance = iDistance;
                oBestMatch.firstDiffPos = iFirstDiffPos;
                oBestMatch.missingTokens = aMissingTokens;
                oBestMatch.pattern = oAvailableFormats[sTestSkeleton];
                oBestMatch.patternTokens = aTestTokens;
            }
        }
        if (oBestMatch.pattern) {
            return oBestMatch;
        }
    },
    _expandFields: function (vPattern, aPatternTokens, aTokens) {
        var bSinglePattern = typeof vPattern === 'string';
        var aPatterns;
        if (bSinglePattern) {
            aPatterns = [vPattern];
        } else {
            aPatterns = vPattern;
        }
        var aResult = aPatterns.map(function (sPattern) {
            var mGroups = {}, mPatternGroups = {}, sResultPatterm = '', bQuoted = false, i = 0, iSkeletonLength, iPatternLength, iOldLength, iNewLength, oSkeletonToken, oBestToken, oSymbol, oSkeletonSymbol, oBestSymbol, sChar;
            aTokens.forEach(function (oToken) {
                mGroups[oToken.group] = oToken;
            });
            aPatternTokens.forEach(function (oToken) {
                mPatternGroups[oToken.group] = oToken;
            });
            while (i < sPattern.length) {
                sChar = sPattern.charAt(i);
                if (bQuoted) {
                    sResultPatterm += sChar;
                    if (sChar == '\'') {
                        bQuoted = false;
                    }
                } else {
                    oSymbol = mCLDRSymbols[sChar];
                    if (oSymbol && mGroups[oSymbol.group] && mPatternGroups[oSymbol.group]) {
                        oSkeletonToken = mGroups[oSymbol.group];
                        oBestToken = mPatternGroups[oSymbol.group];
                        oSkeletonSymbol = mCLDRSymbols[oSkeletonToken.symbol];
                        oBestSymbol = mCLDRSymbols[oBestToken.symbol];
                        iSkeletonLength = oSkeletonToken.length;
                        iPatternLength = oBestToken.length;
                        iOldLength = 1;
                        while (sPattern.charAt(i + 1) == sChar) {
                            i++;
                            iOldLength++;
                        }
                        if (iSkeletonLength === iPatternLength || (iSkeletonLength < oSkeletonSymbol.numericCeiling ? iPatternLength >= oBestSymbol.numericCeiling : iPatternLength < oBestSymbol.numericCeiling)) {
                            iNewLength = iOldLength;
                        } else {
                            iNewLength = Math.max(iOldLength, iSkeletonLength);
                        }
                        for (var j = 0; j < iNewLength; j++) {
                            sResultPatterm += sChar;
                        }
                    } else {
                        sResultPatterm += sChar;
                        if (sChar == '\'') {
                            bQuoted = true;
                        }
                    }
                }
                i++;
            }
            return sResultPatterm;
        });
        return bSinglePattern ? aResult[0] : aResult;
    },
    _appendItems: function (aPatterns, aMissingTokens, sCalendarType) {
        var oAppendItems = this._get(getCLDRCalendarName(sCalendarType), 'dateTimeFormats', 'appendItems');
        aPatterns.forEach(function (sPattern, iIndex) {
            var sDisplayName, sAppendPattern, sAppendField;
            aMissingTokens.forEach(function (oToken) {
                sAppendPattern = oAppendItems[oToken.group];
                sDisplayName = '\'' + this.getDisplayName(oToken.field) + '\'';
                sAppendField = '';
                for (var i = 0; i < oToken.length; i++) {
                    sAppendField += oToken.symbol;
                }
                aPatterns[iIndex] = sAppendPattern.replace(/\{0\}/, sPattern).replace(/\{1\}/, sAppendField).replace(/\{2\}/, sDisplayName);
            }.bind(this));
        }.bind(this));
        return aPatterns;
    },
    _getMixedFormatPattern: function (sSkeleton, oAvailableFormats, sCalendarType, vDiff) {
        var rMixedSkeleton = /^([GyYqQMLwWEecdD]+)([hHkKjJmszZvVOXx]+)$/, rWideMonth = /MMMM|LLLL/, rAbbrevMonth = /MMM|LLL/, rWeekDay = /E|e|c/, oResult, sDateSkeleton, sTimeSkeleton, sStyle, sDatePattern, sTimePattern, sDateTimePattern, sResultPattern;
        oResult = rMixedSkeleton.exec(sSkeleton);
        sDateSkeleton = oResult[1];
        sTimeSkeleton = oResult[2];
        sDatePattern = this._getFormatPattern(sDateSkeleton, oAvailableFormats, sCalendarType);
        if (vDiff) {
            sTimePattern = this.getCustomIntervalPattern(sTimeSkeleton, vDiff, sCalendarType);
        } else {
            sTimePattern = this._getFormatPattern(sTimeSkeleton, oAvailableFormats, sCalendarType);
        }
        if (rWideMonth.test(sDateSkeleton)) {
            sStyle = rWeekDay.test(sDateSkeleton) ? 'full' : 'long';
        } else if (rAbbrevMonth.test(sDateSkeleton)) {
            sStyle = 'medium';
        } else {
            sStyle = 'short';
        }
        sDateTimePattern = this.getDateTimePattern(sStyle, sCalendarType);
        sResultPattern = sDateTimePattern.replace(/\{1\}/, sDatePattern).replace(/\{0\}/, sTimePattern);
        return sResultPattern;
    },
    getNumberSymbol: function (sType) {
        fnAssert(sType == 'decimal' || sType == 'group' || sType == 'plusSign' || sType == 'minusSign' || sType == 'percentSign', 'sType must be decimal, group, plusSign, minusSign or percentSign');
        return this._get('symbols-latn-' + sType);
    },
    getDecimalPattern: function () {
        return this._get('decimalFormat').standard;
    },
    getCurrencyPattern: function (sContext) {
        return this._get('currencyFormat')[sContext] || this._get('currencyFormat').standard;
    },
    getCurrencySpacing: function (sPosition) {
        return this._get('currencyFormat', 'currencySpacing', sPosition === 'after' ? 'afterCurrency' : 'beforeCurrency');
    },
    getPercentPattern: function () {
        return this._get('percentFormat').standard;
    },
    getMinimalDaysInFirstWeek: function () {
        return this._get('weekData-minDays');
    },
    getFirstDayOfWeek: function () {
        return this._get('weekData-firstDay');
    },
    getWeekendStart: function () {
        return this._get('weekData-weekendStart');
    },
    getWeekendEnd: function () {
        return this._get('weekData-weekendEnd');
    },
    getCurrencyDigits: function (sCurrency) {
        var mCustomCurrencies = this._get('currency');
        if (mCustomCurrencies) {
            if (mCustomCurrencies[sCurrency] && mCustomCurrencies[sCurrency].hasOwnProperty('digits')) {
                return mCustomCurrencies[sCurrency].digits;
            } else if (mCustomCurrencies['DEFAULT'] && mCustomCurrencies['DEFAULT'].hasOwnProperty('digits')) {
                return mCustomCurrencies['DEFAULT'].digits;
            }
        }
        var iDigits = this._get('currencyDigits', sCurrency);
        if (iDigits == null) {
            iDigits = this._get('currencyDigits', 'DEFAULT');
            if (iDigits == null) {
                iDigits = 2;
            }
        }
        return iDigits;
    },
    getCurrencySymbol: function (sCurrency) {
        var oCurrencySymbols = this._get('currencySymbols');
        return oCurrencySymbols && oCurrencySymbols[sCurrency] || sCurrency;
    },
    getCurrencyCodeBySymbol: function (sCurrencySymbol) {
        var oCurrencySymbols = this._get('currencySymbols'), sCurrencyCode;
        for (sCurrencyCode in oCurrencySymbols) {
            if (oCurrencySymbols[sCurrencyCode] === sCurrencySymbol) {
                return sCurrencyCode;
            }
        }
        return sCurrencySymbol;
    },
    getUnitDisplayName: function (sUnit) {
        var mUnitFormat = this.getUnitFormat(sUnit);
        return mUnitFormat && mUnitFormat['displayName'] || '';
    },
    getRelativePatterns: function (aScales, sStyle) {
        if (sStyle === undefined) {
            sStyle = 'wide';
        }
        fnAssert(sStyle === 'wide' || sStyle === 'short' || sStyle === 'narrow', 'sStyle is only allowed to be set with \'wide\', \'short\' or \'narrow\'');
        var aPatterns = [], aPluralCategories = this.getPluralCategories(), oScale, oTimeEntry, iValue, iSign;
        if (!aScales) {
            aScales = [
                'year',
                'month',
                'week',
                'day',
                'hour',
                'minute',
                'second'
            ];
        }
        aScales.forEach(function (sScale) {
            oScale = this._get('dateFields', sScale + '-' + sStyle);
            for (var sEntry in oScale) {
                if (sEntry.indexOf('relative-type-') === 0) {
                    iValue = parseInt(sEntry.substr(14));
                    aPatterns.push({
                        scale: sScale,
                        value: iValue,
                        pattern: oScale[sEntry]
                    });
                } else if (sEntry.indexOf('relativeTime-type-') == 0) {
                    oTimeEntry = oScale[sEntry];
                    iSign = sEntry.substr(18) === 'past' ? -1 : 1;
                    aPluralCategories.forEach(function (sKey) {
                        aPatterns.push({
                            scale: sScale,
                            sign: iSign,
                            pattern: oTimeEntry['relativeTimePattern-count-' + sKey]
                        });
                    });
                }
            }
        }.bind(this));
        return aPatterns;
    },
    getRelativePattern: function (sScale, iDiff, bFuture, sStyle) {
        var sPattern, oTypes, sKey, sPluralCategory;
        if (typeof bFuture === 'string') {
            sStyle = bFuture;
            bFuture = undefined;
        }
        if (bFuture === undefined) {
            bFuture = iDiff > 0;
        }
        if (sStyle === undefined) {
            sStyle = 'wide';
        }
        fnAssert(sStyle === 'wide' || sStyle === 'short' || sStyle === 'narrow', 'sStyle is only allowed to be set with \'wide\', \'short\' or \'narrow\'');
        sKey = sScale + '-' + sStyle;
        if (iDiff === 0 || iDiff === -2 || iDiff === 2) {
            sPattern = this._get('dateFields', sKey, 'relative-type-' + iDiff);
        }
        if (!sPattern) {
            oTypes = this._get('dateFields', sKey, 'relativeTime-type-' + (bFuture ? 'future' : 'past'));
            sPluralCategory = this.getPluralCategory(Math.abs(iDiff).toString());
            sPattern = oTypes['relativeTimePattern-count-' + sPluralCategory];
        }
        return sPattern;
    },
    getRelativeSecond: function (iDiff, sStyle) {
        return this.getRelativePattern('second', iDiff, sStyle);
    },
    getRelativeMinute: function (iDiff, sStyle) {
        if (iDiff == 0) {
            return null;
        }
        return this.getRelativePattern('minute', iDiff, sStyle);
    },
    getRelativeHour: function (iDiff, sStyle) {
        if (iDiff == 0) {
            return null;
        }
        return this.getRelativePattern('hour', iDiff, sStyle);
    },
    getRelativeDay: function (iDiff, sStyle) {
        return this.getRelativePattern('day', iDiff, sStyle);
    },
    getRelativeWeek: function (iDiff, sStyle) {
        return this.getRelativePattern('week', iDiff, sStyle);
    },
    getRelativeMonth: function (iDiff, sStyle) {
        return this.getRelativePattern('month', iDiff, sStyle);
    },
    getDisplayName: function (sType, sStyle) {
        fnAssert(sType == 'second' || sType == 'minute' || sType == 'hour' || sType == 'zone' || sType == 'day' || sType == 'weekday' || sType == 'week' || sType == 'month' || sType == 'quarter' || sType == 'year' || sType == 'era', 'sType must be second, minute, hour, zone, day, weekday, week, month, quarter, year, era');
        if (sStyle === undefined) {
            sStyle = 'wide';
        }
        fnAssert(sStyle === 'wide' || sStyle === 'short' || sStyle === 'narrow', 'sStyle is only allowed to be set with \'wide\', \'short\' or \'narrow\'');
        var aSingleFormFields = [
                'era',
                'weekday',
                'zone'
            ], sKey = aSingleFormFields.indexOf(sType) === -1 ? sType + '-' + sStyle : sType;
        return this._get('dateFields', sKey, 'displayName');
    },
    getRelativeYear: function (iDiff, sStyle) {
        return this.getRelativePattern('year', iDiff, sStyle);
    },
    getDecimalFormat: function (sStyle, sNumber, sPlural) {
        var sFormat;
        var oFormats;
        switch (sStyle) {
        case 'long':
            oFormats = this._get('decimalFormat-long');
            break;
        default:
            oFormats = this._get('decimalFormat-short');
            break;
        }
        if (oFormats) {
            var sName = sNumber + '-' + sPlural;
            sFormat = oFormats[sName];
            if (!sFormat) {
                sName = sNumber + '-other';
                sFormat = oFormats[sName];
            }
        }
        return sFormat;
    },
    getCurrencyFormat: function (sStyle, sNumber, sPlural) {
        var sFormat;
        var oFormats;
        switch (sStyle) {
        default:
            oFormats = this._get('currencyFormat-short');
            break;
        }
        if (oFormats) {
            var sName = sNumber + '-' + sPlural;
            sFormat = oFormats[sName];
            if (!sFormat) {
                sName = sNumber + '-other';
                sFormat = oFormats[sName];
            }
        }
        return sFormat;
    },
    getListFormat: function (sType, sStyle) {
        var oFormats = this._get('listPattern-' + (sType || 'standard') + '-' + (sStyle || 'wide'));
        if (oFormats) {
            return oFormats;
        }
        return {};
    },
    getResolvedUnitFormat: function (sUnit) {
        sUnit = this.getUnitFromMapping(sUnit) || sUnit;
        return this.getUnitFormat(sUnit);
    },
    getUnitFormat: function (sUnit) {
        return this._get('units', 'short', sUnit);
    },
    getUnitFormats: function () {
        return this._getMerged('units', 'short');
    },
    getUnitFromMapping: function (sMapping) {
        return this._get('unitMappings', sMapping);
    },
    getEras: function (sWidth, sCalendarType) {
        fnAssert(sWidth == 'wide' || sWidth == 'abbreviated' || sWidth == 'narrow', 'sWidth must be wide, abbreviate or narrow');
        var oEras = this._get(getCLDRCalendarName(sCalendarType), 'era-' + sWidth), aEras = [];
        for (var i in oEras) {
            aEras[parseInt(i)] = oEras[i];
        }
        return aEras;
    },
    getEraDates: function (sCalendarType) {
        var oEraDates = this._get('eras-' + sCalendarType.toLowerCase()), aEraDates = [];
        for (var i in oEraDates) {
            aEraDates[parseInt(i)] = oEraDates[i];
        }
        return aEraDates;
    },
    getCalendarWeek: function (sStyle, iWeekNumber) {
        fnAssert(sStyle == 'wide' || sStyle == 'narrow', 'sStyle must be wide or narrow');
        var oMessageBundle = sap.ui.getWCCore().getLibraryResourceBundle('sap.ui.core', this.oLocale.toString()), sKey = 'date.week.calendarweek.' + sStyle;
        return oMessageBundle.getText(sKey, iWeekNumber);
    },
    getPreferredCalendarType: function () {
        var sCalendarPreference = this._get('calendarPreference'), aCalendars = sCalendarPreference ? sCalendarPreference.split(' ') : [], sCalendarName, sType, i;
        for (i = 0; i < aCalendars.length; i++) {
            sCalendarName = aCalendars[i].split('-')[0];
            for (sType in CalendarType) {
                if (sCalendarName === sType.toLowerCase()) {
                    return sType;
                }
            }
        }
        return CalendarType.Gregorian;
    },
    getPreferredHourSymbol: function () {
        return this._get('timeData', '_preferred');
    },
    getPluralCategories: function () {
        var oPlurals = this._get('plurals'), aCategories = Object.keys(oPlurals);
        aCategories.push('other');
        return aCategories;
    },
    getPluralCategory: function (sNumber) {
        var oPlurals = this._get('plurals');
        if (typeof sNumber === 'number') {
            sNumber = sNumber.toString();
        }
        if (!this._pluralTest) {
            this._pluralTest = {};
        }
        for (var sCategory in oPlurals) {
            var fnTest = this._pluralTest[sCategory];
            if (!fnTest) {
                fnTest = this._parsePluralRule(oPlurals[sCategory]);
                this._pluralTest[sCategory] = fnTest;
            }
            if (fnTest(sNumber)) {
                return sCategory;
            }
        }
        return 'other';
    },
    _parsePluralRule: function (sRule) {
        var OP_OR = 'or', OP_AND = 'and', OP_MOD = '%', OP_EQ = '=', OP_NEQ = '!=', OPD_N = 'n', OPD_I = 'i', OPD_F = 'f', OPD_T = 't', OPD_V = 'v', OPD_W = 'w', RANGE = '..', SEP = ',';
        var i = 0, aTokens;
        aTokens = sRule.split(' ');
        function accept(sToken) {
            if (aTokens[i] === sToken) {
                i++;
                return true;
            }
            return false;
        }
        function consume() {
            var sToken = aTokens[i];
            i++;
            return sToken;
        }
        function or_condition() {
            var fnAnd, fnOr;
            fnAnd = and_condition();
            if (accept(OP_OR)) {
                fnOr = or_condition();
                return function (o) {
                    return fnAnd(o) || fnOr(o);
                };
            }
            return fnAnd;
        }
        function and_condition() {
            var fnRelation, fnAnd;
            fnRelation = relation();
            if (accept(OP_AND)) {
                fnAnd = and_condition();
                return function (o) {
                    return fnRelation(o) && fnAnd(o);
                };
            }
            return fnRelation;
        }
        function relation() {
            var fnExpr, fnRangeList, bEq;
            fnExpr = expr();
            if (accept(OP_EQ)) {
                bEq = true;
            } else if (accept(OP_NEQ)) {
                bEq = false;
            } else {
                throw new Error('Expected \'=\' or \'!=\'');
            }
            fnRangeList = range_list();
            if (bEq) {
                return function (o) {
                    return fnRangeList(o).indexOf(fnExpr(o)) >= 0;
                };
            } else {
                return function (o) {
                    return fnRangeList(o).indexOf(fnExpr(o)) === -1;
                };
            }
        }
        function expr() {
            var fnOperand;
            fnOperand = operand();
            if (accept(OP_MOD)) {
                var iDivisor = parseInt(consume());
                return function (o) {
                    return fnOperand(o) % iDivisor;
                };
            }
            return fnOperand;
        }
        function operand() {
            if (accept(OPD_N)) {
                return function (o) {
                    return o.n;
                };
            } else if (accept(OPD_I)) {
                return function (o) {
                    return o.i;
                };
            } else if (accept(OPD_F)) {
                return function (o) {
                    return o.f;
                };
            } else if (accept(OPD_T)) {
                return function (o) {
                    return o.t;
                };
            } else if (accept(OPD_V)) {
                return function (o) {
                    return o.v;
                };
            } else if (accept(OPD_W)) {
                return function (o) {
                    return o.w;
                };
            } else {
                throw new Error('Unknown operand: ' + consume());
            }
        }
        function range_list() {
            var aValues = [], sRangeList = consume(), aParts = sRangeList.split(SEP), aRange, iFrom, iTo;
            aParts.forEach(function (sPart) {
                aRange = sPart.split(RANGE);
                if (aRange.length === 1) {
                    aValues.push(parseInt(sPart));
                } else {
                    iFrom = parseInt(aRange[0]);
                    iTo = parseInt(aRange[1]);
                    for (var i = iFrom; i <= iTo; i++) {
                        aValues.push(i);
                    }
                }
            });
            return function (o) {
                return aValues;
            };
        }
        var fnOr = or_condition();
        if (i != aTokens.length) {
            throw new Error('Not completely parsed');
        }
        return function (sValue) {
            var iDotPos = sValue.indexOf('.'), sDecimal, sFraction, sFractionNoZeros, o;
            if (iDotPos === -1) {
                sDecimal = sValue;
                sFraction = '';
                sFractionNoZeros = '';
            } else {
                sDecimal = sValue.substr(0, iDotPos);
                sFraction = sValue.substr(iDotPos + 1);
                sFractionNoZeros = sFraction.replace(/0+$/, '');
            }
            o = {
                n: parseFloat(sValue),
                i: parseInt(sDecimal),
                v: sFraction.length,
                w: sFractionNoZeros.length,
                f: parseInt(sFraction),
                t: parseInt(sFractionNoZeros)
            };
            return fnOr(o);
        };
    }
});
var mCLDRSymbolGroups = {
    'Era': {
        field: 'era',
        index: 0
    },
    'Year': {
        field: 'year',
        index: 1
    },
    'Quarter': {
        field: 'quarter',
        index: 2
    },
    'Month': {
        field: 'month',
        index: 3
    },
    'Week': {
        field: 'week',
        index: 4
    },
    'Day-Of-Week': {
        field: 'weekday',
        index: 5
    },
    'Day': {
        field: 'day',
        index: 6
    },
    'DayPeriod': {
        field: 'hour',
        index: 7,
        diffOnly: true
    },
    'Hour': {
        field: 'hour',
        index: 8
    },
    'Minute': {
        field: 'minute',
        index: 9
    },
    'Second': {
        field: 'second',
        index: 10
    },
    'Timezone': {
        field: 'zone',
        index: 11
    }
};
var mCLDRSymbols = {
    'G': {
        group: 'Era',
        match: 'Era',
        numericCeiling: 1
    },
    'y': {
        group: 'Year',
        match: 'Year',
        numericCeiling: 100
    },
    'Y': {
        group: 'Year',
        match: 'Year',
        numericCeiling: 100
    },
    'Q': {
        group: 'Quarter',
        match: 'Quarter',
        numericCeiling: 3
    },
    'q': {
        group: 'Quarter',
        match: 'Quarter',
        numericCeiling: 3
    },
    'M': {
        group: 'Month',
        match: 'Month',
        numericCeiling: 3
    },
    'L': {
        group: 'Month',
        match: 'Month',
        numericCeiling: 3
    },
    'w': {
        group: 'Week',
        match: 'Week',
        numericCeiling: 100
    },
    'W': {
        group: 'Week',
        match: 'Week',
        numericCeiling: 100
    },
    'd': {
        group: 'Day',
        match: 'Day',
        numericCeiling: 100
    },
    'D': {
        group: 'Day',
        match: 'Day',
        numericCeiling: 100
    },
    'E': {
        group: 'Day-Of-Week',
        match: 'Day-Of-Week',
        numericCeiling: 1
    },
    'e': {
        group: 'Day-Of-Week',
        match: 'Day-Of-Week',
        numericCeiling: 3
    },
    'c': {
        group: 'Day-Of-Week',
        match: 'Day-Of-Week',
        numericCeiling: 2
    },
    'h': {
        group: 'Hour',
        match: 'Hour12',
        numericCeiling: 100
    },
    'H': {
        group: 'Hour',
        match: 'Hour24',
        numericCeiling: 100
    },
    'k': {
        group: 'Hour',
        match: 'Hour24',
        numericCeiling: 100
    },
    'K': {
        group: 'Hour',
        match: 'Hour12',
        numericCeiling: 100
    },
    'm': {
        group: 'Minute',
        match: 'Minute',
        numericCeiling: 100
    },
    's': {
        group: 'Second',
        match: 'Second',
        numericCeiling: 100
    },
    'z': {
        group: 'Timezone',
        match: 'Timezone',
        numericCeiling: 1
    },
    'Z': {
        group: 'Timezone',
        match: 'Timezone',
        numericCeiling: 1
    },
    'O': {
        group: 'Timezone',
        match: 'Timezone',
        numericCeiling: 1
    },
    'v': {
        group: 'Timezone',
        match: 'Timezone',
        numericCeiling: 1
    },
    'V': {
        group: 'Timezone',
        match: 'Timezone',
        numericCeiling: 1
    },
    'X': {
        group: 'Timezone',
        match: 'Timezone',
        numericCeiling: 1
    },
    'x': {
        group: 'Timezone',
        match: 'Timezone',
        numericCeiling: 1
    },
    'S': {
        group: 'Other',
        numericCeiling: 100
    },
    'u': {
        group: 'Other',
        numericCeiling: 100
    },
    'U': {
        group: 'Other',
        numericCeiling: 1
    },
    'r': {
        group: 'Other',
        numericCeiling: 100
    },
    'F': {
        group: 'Other',
        numericCeiling: 100
    },
    'g': {
        group: 'Other',
        numericCeiling: 100
    },
    'a': {
        group: 'DayPeriod',
        numericCeiling: 1
    },
    'b': {
        group: 'Other',
        numericCeiling: 1
    },
    'B': {
        group: 'Other',
        numericCeiling: 1
    },
    'A': {
        group: 'Other',
        numericCeiling: 100
    }
};
var M_DEFAULT_DATA = {};
var M_ISO639_OLD_TO_NEW$2 = {
    'iw': 'he',
    'ji': 'yi',
    'in': 'id',
    'sh': 'sr'
};
var M_SUPPORTED_LOCALES = function () {
    var LOCALES = Locale$1._cldrLocales, result = {}, i;
    if (LOCALES) {
        for (i = 0; i < LOCALES.length; i++) {
            result[LOCALES[i]] = true;
        }
    }
    return result;
}();
var mLocaleDatas = {};
function getCLDRCalendarName(sCalendarType) {
    if (!sCalendarType) {
        sCalendarType = sap.ui.getWCCore().getConfiguration().getCalendarType();
    }
    return 'ca-' + sCalendarType.toLowerCase();
}
function getData(oLocale) {
    var sLanguage = oLocale.getLanguage() || '', sScript = oLocale.getScript() || '', sRegion = oLocale.getRegion() || '', mData;
    function merge(obj, fallbackObj) {
        var name, value, fallbackValue;
        if (!fallbackObj) {
            return;
        }
        for (name in fallbackObj) {
            if (fallbackObj.hasOwnProperty(name)) {
                value = obj[name];
                fallbackValue = fallbackObj[name];
                if (value === undefined) {
                    obj[name] = fallbackValue;
                } else if (value === null) {
                    delete obj[name];
                } else if (typeof value === 'object' && typeof fallbackValue === 'object') {
                    merge(value, fallbackValue);
                }
            }
        }
    }
    function getOrLoad(sId) {
        if (!mLocaleDatas[sId] && (!M_SUPPORTED_LOCALES || M_SUPPORTED_LOCALES[sId] === true)) {
            var data = mLocaleDatas[sId] = LoaderExtensions.loadResource('sap/ui/core/cldr/' + sId + '.json', {
                dataType: 'json',
                failOnError: false
            });
            if (data && data.__fallbackLocale) {
                merge(data, getOrLoad(data.__fallbackLocale));
                delete data.__fallbackLocale;
            }
        }
        return mLocaleDatas[sId];
    }
    sLanguage = sLanguage && M_ISO639_OLD_TO_NEW$2[sLanguage] || sLanguage;
    if (sLanguage === 'no') {
        sLanguage = 'nb';
    }
    if (sLanguage === 'zh' && !sRegion) {
        if (sScript === 'Hans') {
            sRegion = 'CN';
        } else if (sScript === 'Hant') {
            sRegion = 'TW';
        }
    }
    var sId = sLanguage + '_' + sRegion;
    if (sLanguage && sRegion) {
        mData = getOrLoad(sId);
    }
    if (!mData && sLanguage) {
        mData = getOrLoad(sLanguage);
    }
    mLocaleDatas[sId] = mData || M_DEFAULT_DATA;
    return mLocaleDatas[sId];
}
var CustomLocaleData = LocaleData.extend('sap.ui.core.CustomLocaleData', {
    constructor: function (oLocale) {
        LocaleData.apply(this, arguments);
        this.mCustomData = sap.ui.getWCCore().getFormatSettings().getCustomLocaleData();
    },
    _get: function () {
        var aArguments = Array.prototype.slice.call(arguments), sCalendar, sKey;
        if (aArguments[0].indexOf('ca-') == 0) {
            sCalendar = aArguments[0];
            if (sCalendar == getCLDRCalendarName()) {
                aArguments = aArguments.slice(1);
            }
        }
        sKey = aArguments.join('-');
        var vValue = this.mCustomData[sKey];
        if (vValue == null) {
            vValue = this._getDeep(this.mCustomData, arguments);
            if (vValue == null) {
                vValue = this._getDeep(this.mData, arguments);
            }
        }
        return vValue;
    },
    _getMerged: function () {
        var mData = this._getDeep(this.mData, arguments);
        var mCustomData = this._getDeep(this.mCustomData, arguments);
        return jQuery.extend({}, mData, mCustomData);
    }
});
LocaleData.getInstance = function (oLocale) {
    return oLocale.hasPrivateUseSubtag('sapufmt') ? new CustomLocaleData(oLocale) : new LocaleData(oLocale);
};

var registry = new Map();
var CalendarClassRegistry = {
    getCalendarClass: function (calendarType) {
        return registry.get(calendarType);
    },
    setCalendarClass: function (calendarType, Klass) {
        registry.set(calendarType, Klass);
    }
};

var UniversalDate = BaseObject$1.extend('sap.ui.core.date.UniversalDate', {
    constructor: function () {
        var clDate = UniversalDate.getClass();
        return this.createDate(clDate, arguments);
    }
});
UniversalDate.UTC = function () {
    var clDate = UniversalDate.getClass();
    return clDate.UTC.apply(clDate, arguments);
};
UniversalDate.now = function () {
    return Date.now();
};
UniversalDate.prototype.createDate = function (clDate, aArgs) {
    switch (aArgs.length) {
    case 0:
        return new clDate();
    case 1:
        return new clDate(aArgs[0]);
    case 2:
        return new clDate(aArgs[0], aArgs[1]);
    case 3:
        return new clDate(aArgs[0], aArgs[1], aArgs[2]);
    case 4:
        return new clDate(aArgs[0], aArgs[1], aArgs[2], aArgs[3]);
    case 5:
        return new clDate(aArgs[0], aArgs[1], aArgs[2], aArgs[3], aArgs[4]);
    case 6:
        return new clDate(aArgs[0], aArgs[1], aArgs[2], aArgs[3], aArgs[4], aArgs[5]);
    case 7:
        return new clDate(aArgs[0], aArgs[1], aArgs[2], aArgs[3], aArgs[4], aArgs[5], aArgs[6]);
    }
};
UniversalDate.getInstance = function (oDate, sCalendarType) {
    var clDate, oInstance;
    if (oDate instanceof UniversalDate) {
        oDate = oDate.getJSDate();
    }
    if (!sCalendarType) {
        sCalendarType = sap.ui.getWCCore().getConfiguration().getCalendarType();
    }
    clDate = UniversalDate.getClass(sCalendarType);
    oInstance = Object.create(clDate.prototype);
    oInstance.oDate = oDate;
    oInstance.sCalendarType = sCalendarType;
    return oInstance;
};
UniversalDate.getClass = function (sCalendarType) {
    if (!sCalendarType) {
        sCalendarType = sap.ui.getWCCore().getConfiguration().getCalendarType();
    }
    var Klass = CalendarClassRegistry.getCalendarClass(sCalendarType);
    if (!Klass) {
        if (!sap || !sap.ui || !sap.ui.requireSync) {
            throw new Error('Calendar type [' + sCalendarType + '] is not imported');
        }
        Klass = sap.ui.requireSync('sap/ui/core/date/' + sCalendarType);
    }
    return Klass;
};
[
    'getDate',
    'getMonth',
    'getFullYear',
    'getYear',
    'getDay',
    'getHours',
    'getMinutes',
    'getSeconds',
    'getMilliseconds',
    'getUTCDate',
    'getUTCMonth',
    'getUTCFullYear',
    'getUTCDay',
    'getUTCHours',
    'getUTCMinutes',
    'getUTCSeconds',
    'getUTCMilliseconds',
    'getTime',
    'valueOf',
    'getTimezoneOffset',
    'toString',
    'toDateString',
    'setDate',
    'setFullYear',
    'setYear',
    'setMonth',
    'setHours',
    'setMinutes',
    'setSeconds',
    'setMilliseconds',
    'setUTCDate',
    'setUTCFullYear',
    'setUTCMonth',
    'setUTCHours',
    'setUTCMinutes',
    'setUTCSeconds',
    'setUTCMilliseconds'
].forEach(function (sName) {
    UniversalDate.prototype[sName] = function () {
        return this.oDate[sName].apply(this.oDate, arguments);
    };
});
UniversalDate.prototype.getJSDate = function () {
    return this.oDate;
};
UniversalDate.prototype.getCalendarType = function () {
    return this.sCalendarType;
};
UniversalDate.prototype.getEra = function () {
    return UniversalDate.getEraByDate(this.sCalendarType, this.oDate.getFullYear(), this.oDate.getMonth(), this.oDate.getDate());
};
UniversalDate.prototype.setEra = function (iEra) {
};
UniversalDate.prototype.getUTCEra = function () {
    return UniversalDate.getEraByDate(this.sCalendarType, this.oDate.getUTCFullYear(), this.oDate.getUTCMonth(), this.oDate.getUTCDate());
};
UniversalDate.prototype.setUTCEra = function (iEra) {
};
UniversalDate.prototype.getWeek = function () {
    return UniversalDate.getWeekByDate(this.sCalendarType, this.getFullYear(), this.getMonth(), this.getDate());
};
UniversalDate.prototype.setWeek = function (oWeek) {
    var oDate = UniversalDate.getFirstDateOfWeek(this.sCalendarType, oWeek.year || this.getFullYear(), oWeek.week);
    this.setFullYear(oDate.year, oDate.month, oDate.day);
};
UniversalDate.prototype.getUTCWeek = function () {
    return UniversalDate.getWeekByDate(this.sCalendarType, this.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate());
};
UniversalDate.prototype.setUTCWeek = function (oWeek) {
    var oDate = UniversalDate.getFirstDateOfWeek(this.sCalendarType, oWeek.year || this.getFullYear(), oWeek.week);
    this.setUTCFullYear(oDate.year, oDate.month, oDate.day);
};
UniversalDate.prototype.getQuarter = function () {
    return Math.floor(this.getMonth() / 3);
};
UniversalDate.prototype.getUTCQuarter = function () {
    return Math.floor(this.getUTCMonth() / 3);
};
UniversalDate.prototype.getDayPeriod = function () {
    if (this.getHours() < 12) {
        return 0;
    } else {
        return 1;
    }
};
UniversalDate.prototype.getUTCDayPeriod = function () {
    if (this.getUTCHours() < 12) {
        return 0;
    } else {
        return 1;
    }
};
UniversalDate.prototype.getTimezoneShort = function () {
    if (this.oDate.getTimezoneShort) {
        return this.oDate.getTimezoneShort();
    }
};
UniversalDate.prototype.getTimezoneLong = function () {
    if (this.oDate.getTimezoneLong) {
        return this.oDate.getTimezoneLong();
    }
};
var iMillisecondsInWeek = 7 * 24 * 60 * 60 * 1000;
UniversalDate.getWeekByDate = function (sCalendarType, iYear, iMonth, iDay) {
    var oLocale = sap.ui.getWCCore().getFormatSettings().getFormatLocale(), clDate = this.getClass(sCalendarType), oFirstDay = getFirstDayOfFirstWeek(clDate, iYear), oDate = new clDate(clDate.UTC(iYear, iMonth, iDay)), iWeek, iLastYear, iNextYear, oLastFirstDay, oNextFirstDay;
    if (oLocale.getRegion() === 'US') {
        iWeek = calculateWeeks(oFirstDay, oDate);
    } else {
        iLastYear = iYear - 1;
        iNextYear = iYear + 1;
        oLastFirstDay = getFirstDayOfFirstWeek(clDate, iLastYear);
        oNextFirstDay = getFirstDayOfFirstWeek(clDate, iNextYear);
        if (oDate >= oNextFirstDay) {
            iYear = iNextYear;
            iWeek = 0;
        } else if (oDate < oFirstDay) {
            iYear = iLastYear;
            iWeek = calculateWeeks(oLastFirstDay, oDate);
        } else {
            iWeek = calculateWeeks(oFirstDay, oDate);
        }
    }
    return {
        year: iYear,
        week: iWeek
    };
};
UniversalDate.getFirstDateOfWeek = function (sCalendarType, iYear, iWeek) {
    var oLocale = sap.ui.getWCCore().getFormatSettings().getFormatLocale(), clDate = this.getClass(sCalendarType), oFirstDay = getFirstDayOfFirstWeek(clDate, iYear), oDate = new clDate(oFirstDay.valueOf() + iWeek * iMillisecondsInWeek);
    if (oLocale.getRegion() === 'US' && iWeek === 0 && oFirstDay.getUTCFullYear() < iYear) {
        return {
            year: iYear,
            month: 0,
            day: 1
        };
    }
    return {
        year: oDate.getUTCFullYear(),
        month: oDate.getUTCMonth(),
        day: oDate.getUTCDate()
    };
};
function getFirstDayOfFirstWeek(clDate, iYear) {
    var oLocale = sap.ui.getWCCore().getFormatSettings().getFormatLocale(), oLocaleData = LocaleData.getInstance(oLocale), iMinDays = oLocaleData.getMinimalDaysInFirstWeek(), iFirstDayOfWeek = oLocaleData.getFirstDayOfWeek(), oFirstDay = new clDate(clDate.UTC(iYear, 0, 1)), iDayCount = 7;
    while (oFirstDay.getUTCDay() !== iFirstDayOfWeek) {
        oFirstDay.setUTCDate(oFirstDay.getUTCDate() - 1);
        iDayCount--;
    }
    if (iDayCount < iMinDays) {
        oFirstDay.setUTCDate(oFirstDay.getUTCDate() + 7);
    }
    return oFirstDay;
}
function calculateWeeks(oFromDate, oToDate) {
    return Math.floor((oToDate.valueOf() - oFromDate.valueOf()) / iMillisecondsInWeek);
}
var mEras = {};
UniversalDate.getEraByDate = function (sCalendarType, iYear, iMonth, iDay) {
    var aEras = getEras(sCalendarType), iTimestamp = new Date(0).setUTCFullYear(iYear, iMonth, iDay), oEra;
    for (var i = aEras.length - 1; i >= 0; i--) {
        oEra = aEras[i];
        if (!oEra) {
            continue;
        }
        if (oEra._start && iTimestamp >= oEra._startInfo.timestamp) {
            return i;
        }
        if (oEra._end && iTimestamp < oEra._endInfo.timestamp) {
            return i;
        }
    }
};
UniversalDate.getCurrentEra = function (sCalendarType) {
    var oNow = new Date();
    return this.getEraByDate(sCalendarType, oNow.getFullYear(), oNow.getMonth(), oNow.getDate());
};
UniversalDate.getEraStartDate = function (sCalendarType, iEra) {
    var aEras = getEras(sCalendarType), oEra = aEras[iEra] || aEras[0];
    if (oEra._start) {
        return oEra._startInfo;
    }
};
function getEras(sCalendarType) {
    var oLocale = sap.ui.getWCCore().getFormatSettings().getFormatLocale(), oLocaleData = LocaleData.getInstance(oLocale), aEras = mEras[sCalendarType];
    if (!aEras) {
        var aEras = oLocaleData.getEraDates(sCalendarType);
        if (!aEras[0]) {
            aEras[0] = { _start: '1-1-1' };
        }
        for (var i = 0; i < aEras.length; i++) {
            var oEra = aEras[i];
            if (!oEra) {
                continue;
            }
            if (oEra._start) {
                oEra._startInfo = parseDateString(oEra._start);
            }
            if (oEra._end) {
                oEra._endInfo = parseDateString(oEra._end);
            }
        }
        mEras[sCalendarType] = aEras;
    }
    return aEras;
}
function parseDateString(sDateString) {
    var aParts = sDateString.split('-'), iYear, iMonth, iDay;
    if (aParts[0] == '') {
        iYear = -parseInt(aParts[1]);
        iMonth = parseInt(aParts[2]) - 1;
        iDay = parseInt(aParts[3]);
    } else {
        iYear = parseInt(aParts[0]);
        iMonth = parseInt(aParts[1]) - 1;
        iDay = parseInt(aParts[2]);
    }
    return {
        timestamp: new Date(0).setUTCFullYear(iYear, iMonth, iDay),
        year: iYear,
        month: iMonth,
        day: iDay
    };
}

var Buddhist = UniversalDate.extend('sap.ui.core.date.Buddhist', {
    constructor: function () {
        var aArgs = arguments;
        if (aArgs.length > 1) {
            aArgs = toGregorianArguments(aArgs);
        }
        this.oDate = this.createDate(Date, aArgs);
        this.sCalendarType = CalendarType.Buddhist;
    }
});
Buddhist.UTC = function () {
    var aArgs = toGregorianArguments(arguments);
    return Date.UTC.apply(Date, aArgs);
};
Buddhist.now = function () {
    return Date.now();
};
function toBuddhist(oGregorian) {
    var iEraStartYear = UniversalDate.getEraStartDate(CalendarType.Buddhist, 0).year, iYear = oGregorian.year - iEraStartYear + 1;
    if (oGregorian.year < 1941 && oGregorian.month < 3) {
        iYear -= 1;
    }
    if (oGregorian.year === null) {
        iYear = undefined;
    }
    return {
        year: iYear,
        month: oGregorian.month,
        day: oGregorian.day
    };
}
function toGregorian(oBuddhist) {
    var iEraStartYear = UniversalDate.getEraStartDate(CalendarType.Buddhist, 0).year, iYear = oBuddhist.year + iEraStartYear - 1;
    if (iYear < 1941 && oBuddhist.month < 3) {
        iYear += 1;
    }
    if (oBuddhist.year === null) {
        iYear = undefined;
    }
    return {
        year: iYear,
        month: oBuddhist.month,
        day: oBuddhist.day
    };
}
function toGregorianArguments(aArgs) {
    var oBuddhist, oGregorian;
    oBuddhist = {
        year: aArgs[0],
        month: aArgs[1],
        day: aArgs[2] !== undefined ? aArgs[2] : 1
    };
    oGregorian = toGregorian(oBuddhist);
    aArgs[0] = oGregorian.year;
    return aArgs;
}
Buddhist.prototype._getBuddhist = function () {
    var oGregorian = {
        year: this.oDate.getFullYear(),
        month: this.oDate.getMonth(),
        day: this.oDate.getDate()
    };
    return toBuddhist(oGregorian);
};
Buddhist.prototype._setBuddhist = function (oBuddhist) {
    var oGregorian = toGregorian(oBuddhist);
    return this.oDate.setFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
};
Buddhist.prototype._getUTCBuddhist = function () {
    var oGregorian = {
        year: this.oDate.getUTCFullYear(),
        month: this.oDate.getUTCMonth(),
        day: this.oDate.getUTCDate()
    };
    return toBuddhist(oGregorian);
};
Buddhist.prototype._setUTCBuddhist = function (oBuddhist) {
    var oGregorian = toGregorian(oBuddhist);
    return this.oDate.setUTCFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
};
Buddhist.prototype.getYear = function () {
    return this._getBuddhist().year;
};
Buddhist.prototype.getFullYear = function () {
    return this._getBuddhist().year;
};
Buddhist.prototype.getUTCFullYear = function () {
    return this._getUTCBuddhist().year;
};
Buddhist.prototype.setYear = function (iYear) {
    var oBuddhist = this._getBuddhist();
    oBuddhist.year = iYear;
    return this._setBuddhist(oBuddhist);
};
Buddhist.prototype.setFullYear = function (iYear, iMonth, iDay) {
    var oBuddhist = this._getBuddhist();
    oBuddhist.year = iYear;
    if (iMonth !== undefined) {
        oBuddhist.month = iMonth;
    }
    if (iDay !== undefined) {
        oBuddhist.day = iDay;
    }
    return this._setBuddhist(oBuddhist);
};
Buddhist.prototype.setUTCFullYear = function (iYear, iMonth, iDay) {
    var oBuddhist = this._getUTCBuddhist();
    oBuddhist.year = iYear;
    if (iMonth !== undefined) {
        oBuddhist.month = iMonth;
    }
    if (iDay !== undefined) {
        oBuddhist.day = iDay;
    }
    return this._setUTCBuddhist(oBuddhist);
};
Buddhist.prototype.getWeek = function () {
    return UniversalDate.getWeekByDate(this.sCalendarType, this.oDate.getFullYear(), this.getMonth(), this.getDate());
};
Buddhist.prototype.getUTCWeek = function () {
    return UniversalDate.getWeekByDate(this.sCalendarType, this.oDate.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate());
};
CalendarClassRegistry.setCalendarClass(CalendarType.Buddhist, Buddhist);

var Islamic = UniversalDate.extend('sap.ui.core.date.Islamic', {
    constructor: function () {
        var aArgs = arguments;
        if (aArgs.length > 1) {
            aArgs = toGregorianArguments$1(aArgs);
        }
        this.oDate = this.createDate(Date, aArgs);
        this.sCalendarType = CalendarType.Islamic;
    }
});
Islamic.UTC = function () {
    var aArgs = toGregorianArguments$1(arguments);
    return Date.UTC.apply(Date, aArgs);
};
Islamic.now = function () {
    return Date.now();
};
var BASE_YEAR = 1400, GREGORIAN_EPOCH_DAYS = 1721425.5, ISLAMIC_EPOCH_DAYS = 1948439.5, ISLAMIC_MILLIS = -42521587200000, ONE_DAY = 86400000;
var oCustomizationMap = null;
function toIslamic(oGregorian) {
    var iGregorianYear = oGregorian.year, iGregorianMonth = oGregorian.month, iGregorianDay = oGregorian.day, iIslamicYear, iIslamicMonth, iIslamicDay, iMonths, iDays, iLeapAdj, iJulianDay;
    iLeapAdj = 0;
    if (iGregorianMonth + 1 > 2) {
        iLeapAdj = isGregorianLeapYear(iGregorianYear) ? -1 : -2;
    }
    iJulianDay = GREGORIAN_EPOCH_DAYS - 1 + 365 * (iGregorianYear - 1) + Math.floor((iGregorianYear - 1) / 4) + -Math.floor((iGregorianYear - 1) / 100) + Math.floor((iGregorianYear - 1) / 400) + Math.floor((367 * (iGregorianMonth + 1) - 362) / 12 + iLeapAdj + iGregorianDay);
    iJulianDay = Math.floor(iJulianDay) + 0.5;
    iDays = iJulianDay - ISLAMIC_EPOCH_DAYS;
    iMonths = Math.floor(iDays / 29.530588853);
    if (iMonths < 0) {
        iIslamicYear = Math.floor(iMonths / 12) + 1;
        iIslamicMonth = iMonths % 12;
        if (iIslamicMonth < 0) {
            iIslamicMonth += 12;
        }
        iIslamicDay = iDays - monthStart(iIslamicYear, iIslamicMonth) + 1;
    } else {
        iMonths++;
        while (getCustomMonthStartDays(iMonths) > iDays) {
            iMonths--;
        }
        iIslamicYear = Math.floor(iMonths / 12) + 1;
        iIslamicMonth = iMonths % 12;
        iIslamicDay = iDays - getCustomMonthStartDays(12 * (iIslamicYear - 1) + iIslamicMonth) + 1;
    }
    return {
        day: iIslamicDay,
        month: iIslamicMonth,
        year: iIslamicYear
    };
}
function toGregorian$1(oIslamic) {
    var iIslamicYear = oIslamic.year, iIslamicMonth = oIslamic.month, iIslamicDate = oIslamic.day, iMonthStart = iIslamicYear < 1 ? monthStart(iIslamicYear, iIslamicMonth) : getCustomMonthStartDays(12 * (iIslamicYear - 1) + iIslamicMonth), iJulianDay = iIslamicDate + iMonthStart + ISLAMIC_EPOCH_DAYS - 1, iJulianDayNoon = Math.floor(iJulianDay - 0.5) + 0.5, iDaysSinceGregorianEpoch = iJulianDayNoon - GREGORIAN_EPOCH_DAYS, iQuadricent = Math.floor(iDaysSinceGregorianEpoch / 146097), iQuadricentNormalized = mod(iDaysSinceGregorianEpoch, 146097), iCent = Math.floor(iQuadricentNormalized / 36524), iCentNormalized = mod(iQuadricentNormalized, 36524), iQuad = Math.floor(iCentNormalized / 1461), iQuadNormalized = mod(iCentNormalized, 1461), iYearIndex = Math.floor(iQuadNormalized / 365), iYear = iQuadricent * 400 + iCent * 100 + iQuad * 4 + iYearIndex, iMonth, iDay, iGregorianYearStartDays, iDayOfYear, tjd, tjd2, iLeapAdj, iLeapAdj2;
    if (!(iCent == 4 || iYearIndex == 4)) {
        iYear++;
    }
    iGregorianYearStartDays = GREGORIAN_EPOCH_DAYS + 365 * (iYear - 1) + Math.floor((iYear - 1) / 4) - Math.floor((iYear - 1) / 100) + Math.floor((iYear - 1) / 400);
    iDayOfYear = iJulianDayNoon - iGregorianYearStartDays;
    tjd = GREGORIAN_EPOCH_DAYS - 1 + 365 * (iYear - 1) + Math.floor((iYear - 1) / 4) - Math.floor((iYear - 1) / 100) + Math.floor((iYear - 1) / 400) + Math.floor(739 / 12 + (isGregorianLeapYear(iYear) ? -1 : -2) + 1);
    iLeapAdj = 0;
    if (iJulianDayNoon < tjd) {
        iLeapAdj = 0;
    } else {
        iLeapAdj = isGregorianLeapYear(iYear) ? 1 : 2;
    }
    iMonth = Math.floor(((iDayOfYear + iLeapAdj) * 12 + 373) / 367);
    tjd2 = GREGORIAN_EPOCH_DAYS - 1 + 365 * (iYear - 1) + Math.floor((iYear - 1) / 4) - Math.floor((iYear - 1) / 100) + Math.floor((iYear - 1) / 400);
    iLeapAdj2 = 0;
    if (iMonth > 2) {
        iLeapAdj2 = isGregorianLeapYear(iYear) ? -1 : -2;
    }
    tjd2 += Math.floor((367 * iMonth - 362) / 12 + iLeapAdj2 + 1);
    iDay = iJulianDayNoon - tjd2 + 1;
    return {
        day: iDay,
        month: iMonth - 1,
        year: iYear
    };
}
function toGregorianArguments$1(aArgs) {
    var aGregorianArgs = Array.prototype.slice.call(aArgs), oIslamic, oGregorian;
    oIslamic = {
        year: aArgs[0],
        month: aArgs[1],
        day: aArgs[2] !== undefined ? aArgs[2] : 1
    };
    oGregorian = toGregorian$1(oIslamic);
    aGregorianArgs[0] = oGregorian.year;
    aGregorianArgs[1] = oGregorian.month;
    aGregorianArgs[2] = oGregorian.day;
    return aGregorianArgs;
}
function initCustomizationMap() {
    var sDateFormat, oCustomizationJSON;
    oCustomizationMap = {};
    sDateFormat = sap.ui.getWCCore().getFormatSettings().getLegacyDateFormat();
    oCustomizationJSON = sap.ui.getWCCore().getFormatSettings().getLegacyDateCalendarCustomizing();
    oCustomizationJSON = oCustomizationJSON || [];
    if (!sDateFormat && !oCustomizationJSON.length) {
        Log.info('No calendar customizations.');
        return;
    }
    if (sDateFormat && !oCustomizationJSON.length || !sDateFormat && oCustomizationJSON.length) {
        Log.warning('There is an inconsistency between customization data [' + JSON.stringify(oCustomizationJSON) + '] and the date format [' + sDateFormat + ']. Calendar customization won\'t be used.');
        return;
    }
    oCustomizationJSON.forEach(function (oEntry) {
        if (oEntry.dateFormat === sDateFormat) {
            var date = parseDate(oEntry.gregDate);
            var iGregorianDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
            var iMillis = iGregorianDate.getTime();
            var iIslamicMonthStartDays = (iMillis - ISLAMIC_MILLIS) / ONE_DAY;
            date = parseDate(oEntry.islamicMonthStart);
            var iIslamicMonths = (date.year - 1) * 12 + date.month - 1;
            oCustomizationMap[iIslamicMonths] = iIslamicMonthStartDays;
        }
    });
    Log.info('Working with date format: [' + sDateFormat + '] and customization: ' + JSON.stringify(oCustomizationJSON));
}
function parseDate(sDate) {
    return {
        year: parseInt(sDate.substr(0, 4)),
        month: parseInt(sDate.substr(4, 2)),
        day: parseInt(sDate.substr(6, 2))
    };
}
function getCustomMonthStartDays(months) {
    if (!oCustomizationMap) {
        initCustomizationMap();
    }
    var iIslamicMonthStartDays = oCustomizationMap[months];
    if (!iIslamicMonthStartDays) {
        var year = Math.floor(months / 12) + 1;
        var month = months % 12;
        iIslamicMonthStartDays = monthStart(year, month);
    }
    return iIslamicMonthStartDays;
}
function monthStart(year, month) {
    return Math.ceil(29.5 * month) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30);
}
function mod(a, b) {
    return a - b * Math.floor(a / b);
}
function isGregorianLeapYear(iYear) {
    return !(iYear % 400) || !(iYear % 4) && !!(iYear % 100);
}
Islamic.prototype._getIslamic = function () {
    return toIslamic({
        day: this.oDate.getDate(),
        month: this.oDate.getMonth(),
        year: this.oDate.getFullYear()
    });
};
Islamic.prototype._setIslamic = function (oIslamic) {
    var oGregorian = toGregorian$1(oIslamic);
    return this.oDate.setFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
};
Islamic.prototype._getUTCIslamic = function () {
    return toIslamic({
        day: this.oDate.getUTCDate(),
        month: this.oDate.getUTCMonth(),
        year: this.oDate.getUTCFullYear()
    });
};
Islamic.prototype._setUTCIslamic = function (oIslamic) {
    var oGregorian = toGregorian$1(oIslamic);
    return this.oDate.setUTCFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
};
Islamic.prototype.getDate = function (iDate) {
    return this._getIslamic().day;
};
Islamic.prototype.getMonth = function () {
    return this._getIslamic().month;
};
Islamic.prototype.getYear = function () {
    return this._getIslamic().year - BASE_YEAR;
};
Islamic.prototype.getFullYear = function () {
    return this._getIslamic().year;
};
Islamic.prototype.setDate = function (iDate) {
    var oIslamic = this._getIslamic();
    oIslamic.day = iDate;
    return this._setIslamic(oIslamic);
};
Islamic.prototype.setMonth = function (iMonth, iDay) {
    var oIslamic = this._getIslamic();
    oIslamic.month = iMonth;
    if (iDay !== undefined) {
        oIslamic.day = iDay;
    }
    return this._setIslamic(oIslamic);
};
Islamic.prototype.setYear = function (iYear) {
    var oIslamic = this._getIslamic();
    oIslamic.year = iYear + BASE_YEAR;
    return this._setIslamic(oIslamic);
};
Islamic.prototype.setFullYear = function (iYear, iMonth, iDay) {
    var oIslamic = this._getIslamic();
    oIslamic.year = iYear;
    if (iMonth !== undefined) {
        oIslamic.month = iMonth;
    }
    if (iDay !== undefined) {
        oIslamic.day = iDay;
    }
    return this._setIslamic(oIslamic);
};
Islamic.prototype.getUTCDate = function (iDate) {
    return this._getUTCIslamic().day;
};
Islamic.prototype.getUTCMonth = function () {
    return this._getUTCIslamic().month;
};
Islamic.prototype.getUTCFullYear = function () {
    return this._getUTCIslamic().year;
};
Islamic.prototype.setUTCDate = function (iDate) {
    var oIslamic = this._getUTCIslamic();
    oIslamic.day = iDate;
    return this._setUTCIslamic(oIslamic);
};
Islamic.prototype.setUTCMonth = function (iMonth, iDay) {
    var oIslamic = this._getUTCIslamic();
    oIslamic.month = iMonth;
    if (iDay !== undefined) {
        oIslamic.day = iDay;
    }
    return this._setUTCIslamic(oIslamic);
};
Islamic.prototype.setUTCFullYear = function (iYear, iMonth, iDay) {
    var oIslamic = this._getUTCIslamic();
    oIslamic.year = iYear;
    if (iMonth !== undefined) {
        oIslamic.month = iMonth;
    }
    if (iDay !== undefined) {
        oIslamic.day = iDay;
    }
    return this._setUTCIslamic(oIslamic);
};
CalendarClassRegistry.setCalendarClass(CalendarType.Islamic, Islamic);

var Japanese = UniversalDate.extend('sap.ui.core.date.Japanese', {
    constructor: function () {
        var aArgs = arguments;
        if (aArgs.length > 1) {
            aArgs = toGregorianArguments$2(aArgs);
        }
        this.oDate = this.createDate(Date, aArgs);
        this.sCalendarType = CalendarType.Japanese;
    }
});
Japanese.UTC = function () {
    var aArgs = toGregorianArguments$2(arguments);
    return Date.UTC.apply(Date, aArgs);
};
Japanese.now = function () {
    return Date.now();
};
function toJapanese(oGregorian) {
    var iEra = UniversalDate.getEraByDate(CalendarType.Japanese, oGregorian.year, oGregorian.month, oGregorian.day), iEraStartYear = UniversalDate.getEraStartDate(CalendarType.Japanese, iEra).year;
    return {
        era: iEra,
        year: oGregorian.year - iEraStartYear + 1,
        month: oGregorian.month,
        day: oGregorian.day
    };
}
function toGregorian$2(oJapanese) {
    var iEraStartYear = UniversalDate.getEraStartDate(CalendarType.Japanese, oJapanese.era).year;
    return {
        year: iEraStartYear + oJapanese.year - 1,
        month: oJapanese.month,
        day: oJapanese.day
    };
}
function toGregorianArguments$2(aArgs) {
    var oJapanese, oGregorian, iEra, vYear = aArgs[0];
    if (typeof vYear == 'number') {
        if (vYear >= 100) {
            return aArgs;
        } else {
            iEra = UniversalDate.getCurrentEra(CalendarType.Japanese);
            vYear = [
                iEra,
                vYear
            ];
        }
    } else if (!Array.isArray(vYear)) {
        vYear = [];
    }
    oJapanese = {
        era: vYear[0],
        year: vYear[1],
        month: aArgs[1],
        day: aArgs[2] !== undefined ? aArgs[2] : 1
    };
    oGregorian = toGregorian$2(oJapanese);
    aArgs[0] = oGregorian.year;
    return aArgs;
}
Japanese.prototype._getJapanese = function () {
    var oGregorian = {
        year: this.oDate.getFullYear(),
        month: this.oDate.getMonth(),
        day: this.oDate.getDate()
    };
    return toJapanese(oGregorian);
};
Japanese.prototype._setJapanese = function (oJapanese) {
    var oGregorian = toGregorian$2(oJapanese);
    return this.oDate.setFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
};
Japanese.prototype._getUTCJapanese = function () {
    var oGregorian = {
        year: this.oDate.getUTCFullYear(),
        month: this.oDate.getUTCMonth(),
        day: this.oDate.getUTCDate()
    };
    return toJapanese(oGregorian);
};
Japanese.prototype._setUTCJapanese = function (oJapanese) {
    var oGregorian = toGregorian$2(oJapanese);
    return this.oDate.setUTCFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
};
Japanese.prototype.getYear = function () {
    return this._getJapanese().year;
};
Japanese.prototype.getFullYear = function () {
    return this._getJapanese().year;
};
Japanese.prototype.getEra = function () {
    return this._getJapanese().era;
};
Japanese.prototype.getUTCFullYear = function () {
    return this._getUTCJapanese().year;
};
Japanese.prototype.getUTCEra = function () {
    return this._getUTCJapanese().era;
};
Japanese.prototype.setYear = function (iYear) {
    var oJapanese = this._getJapanese();
    oJapanese.year = iYear;
    return this._setJapanese(oJapanese);
};
Japanese.prototype.setFullYear = function (iYear, iMonth, iDay) {
    var oJapanese = this._getJapanese();
    oJapanese.year = iYear;
    if (iMonth !== undefined) {
        oJapanese.month = iMonth;
    }
    if (iDay !== undefined) {
        oJapanese.day = iDay;
    }
    return this._setJapanese(oJapanese);
};
Japanese.prototype.setEra = function (iEra, iYear, iMonth, iDay) {
    var oEraStartDate = UniversalDate.getEraStartDate(CalendarType.Japanese, iEra), oJapanese = toJapanese(oEraStartDate);
    if (iYear !== undefined) {
        oJapanese.year = iYear;
    }
    if (iMonth !== undefined) {
        oJapanese.month = iMonth;
    }
    if (iDay !== undefined) {
        oJapanese.day = iDay;
    }
    return this._setJapanese(oJapanese);
};
Japanese.prototype.setUTCFullYear = function (iYear, iMonth, iDay) {
    var oJapanese = this._getUTCJapanese();
    oJapanese.year = iYear;
    if (iMonth !== undefined) {
        oJapanese.month = iMonth;
    }
    if (iDay !== undefined) {
        oJapanese.day = iDay;
    }
    return this._setUTCJapanese(oJapanese);
};
Japanese.prototype.setUTCEra = function (iEra, iYear, iMonth, iDay) {
    var oEraStartDate = UniversalDate.getEraStartDate(CalendarType.Japanese, iEra), oJapanese = toJapanese(oEraStartDate);
    if (iYear !== undefined) {
        oJapanese.year = iYear;
    }
    if (iMonth !== undefined) {
        oJapanese.month = iMonth;
    }
    if (iDay !== undefined) {
        oJapanese.day = iDay;
    }
    return this._setUTCJapanese(oJapanese);
};
Japanese.prototype.getWeek = function () {
    return UniversalDate.getWeekByDate(this.sCalendarType, this.oDate.getFullYear(), this.getMonth(), this.getDate());
};
Japanese.prototype.getUTCWeek = function () {
    return UniversalDate.getWeekByDate(this.sCalendarType, this.oDate.getUTCFullYear(), this.getUTCMonth(), this.getUTCDate());
};
CalendarClassRegistry.setCalendarClass(CalendarType.Japanese, Japanese);

var Persian = UniversalDate.extend('sap.ui.core.date.Persian', {
    constructor: function () {
        var aArgs = arguments;
        if (aArgs.length > 1) {
            aArgs = toGregorianArguments$3(aArgs);
        }
        this.oDate = this.createDate(Date, aArgs);
        this.sCalendarType = CalendarType.Persian;
    }
});
Persian.UTC = function () {
    var aArgs = toGregorianArguments$3(arguments);
    return Date.UTC.apply(Date, aArgs);
};
Persian.now = function () {
    return Date.now();
};
var BASE_YEAR$1 = 1300;
function toPersian(oGregorian) {
    var iJulianDayNumber = g2d(oGregorian.year, oGregorian.month + 1, oGregorian.day);
    return d2j(iJulianDayNumber);
}
function toGregorian$3(oPersian) {
    var iJulianDayNumber = j2d(oPersian.year, oPersian.month + 1, oPersian.day);
    return d2g(iJulianDayNumber);
}
function toGregorianArguments$3(aArgs) {
    var aGregorianArgs = Array.prototype.slice.call(aArgs), oPersian, oGregorian;
    if (typeof aArgs[0] !== 'number' || typeof aArgs[1] !== 'number' || aArgs[2] !== undefined && typeof aArgs[2] != 'number') {
        aGregorianArgs[0] = NaN;
        aGregorianArgs[1] = NaN;
        aGregorianArgs[2] = NaN;
        return aGregorianArgs;
    }
    oPersian = {
        year: aArgs[0],
        month: aArgs[1],
        day: aArgs[2] !== undefined ? aArgs[2] : 1
    };
    oGregorian = toGregorian$3(oPersian);
    aGregorianArgs[0] = oGregorian.year;
    aGregorianArgs[1] = oGregorian.month;
    aGregorianArgs[2] = oGregorian.day;
    return aGregorianArgs;
}
function jalCal(jy) {
    var breaks = [
            -61,
            9,
            38,
            199,
            426,
            686,
            756,
            818,
            1111,
            1181,
            1210,
            1635,
            2060,
            2097,
            2192,
            2262,
            2324,
            2394,
            2456,
            3178
        ], bl = breaks.length, gy = jy + 621, leapJ = -14, jp = breaks[0], jm, jump, leap, leapG, march, n, i;
    for (i = 1; i < bl; i += 1) {
        jm = breaks[i];
        jump = jm - jp;
        if (jy < jm) {
            break;
        }
        leapJ = leapJ + div(jump, 33) * 8 + div(mod$1(jump, 33), 4);
        jp = jm;
    }
    n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod$1(n, 33) + 3, 4);
    if (mod$1(jump, 33) === 4 && jump - n === 4) {
        leapJ += 1;
    }
    leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    march = 20 + leapJ - leapG;
    if (jump - n < 6) {
        n = n - jump + div(jump + 4, 33) * 33;
    }
    leap = mod$1(mod$1(n + 1, 33) - 1, 4);
    if (leap === -1) {
        leap = 4;
    }
    return {
        leap: leap,
        gy: gy,
        march: march
    };
}
function j2d(jy, jm, jd) {
    while (jm < 1) {
        jm += 12;
        jy--;
    }
    while (jm > 12) {
        jm -= 12;
        jy++;
    }
    var r = jalCal(jy);
    return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}
function d2j(jdn) {
    var gy = d2g(jdn).year, jy = gy - 621, r = jalCal(jy), jdn1f = g2d(gy, 3, r.march), jd, jm, k;
    k = jdn - jdn1f;
    if (k >= 0) {
        if (k <= 185) {
            jm = 1 + div(k, 31);
            jd = mod$1(k, 31) + 1;
            return {
                year: jy,
                month: jm - 1,
                day: jd
            };
        } else {
            k -= 186;
        }
    } else {
        jy -= 1;
        k += 179;
        if (r.leap === 1) {
            k += 1;
        }
    }
    jm = 7 + div(k, 30);
    jd = mod$1(k, 30) + 1;
    return {
        year: jy,
        month: jm - 1,
        day: jd
    };
}
function g2d(gy, gm, gd) {
    var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod$1(gm + 9, 12) + 2, 5) + gd - 34840408;
    d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
    return d;
}
function d2g(jdn) {
    var j, i, gd, gm, gy;
    j = 4 * jdn + 139361631;
    j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    i = div(mod$1(j, 1461), 4) * 5 + 308;
    gd = div(mod$1(i, 153), 5) + 1;
    gm = mod$1(div(i, 153), 12) + 1;
    gy = div(j, 1461) - 100100 + div(8 - gm, 6);
    return {
        year: gy,
        month: gm - 1,
        day: gd
    };
}
function div(a, b) {
    return ~~(a / b);
}
function mod$1(a, b) {
    return a - ~~(a / b) * b;
}
Persian.prototype._getPersian = function () {
    return toPersian({
        day: this.oDate.getDate(),
        month: this.oDate.getMonth(),
        year: this.oDate.getFullYear()
    });
};
Persian.prototype._setPersian = function (oPersian) {
    var oGregorian = toGregorian$3(oPersian);
    return this.oDate.setFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
};
Persian.prototype._getUTCPersian = function () {
    return toPersian({
        day: this.oDate.getUTCDate(),
        month: this.oDate.getUTCMonth(),
        year: this.oDate.getUTCFullYear()
    });
};
Persian.prototype._setUTCPersian = function (oPersian) {
    var oGregorian = toGregorian$3(oPersian);
    return this.oDate.setUTCFullYear(oGregorian.year, oGregorian.month, oGregorian.day);
};
Persian.prototype.getDate = function (iDate) {
    return this._getPersian().day;
};
Persian.prototype.getMonth = function () {
    return this._getPersian().month;
};
Persian.prototype.getYear = function () {
    return this._getPersian().year - BASE_YEAR$1;
};
Persian.prototype.getFullYear = function () {
    return this._getPersian().year;
};
Persian.prototype.setDate = function (iDate) {
    var oPersian = this._getPersian();
    oPersian.day = iDate;
    return this._setPersian(oPersian);
};
Persian.prototype.setMonth = function (iMonth, iDay) {
    var oPersian = this._getPersian();
    oPersian.month = iMonth;
    if (iDay !== undefined) {
        oPersian.day = iDay;
    }
    return this._setPersian(oPersian);
};
Persian.prototype.setYear = function (iYear) {
    var oPersian = this._getPersian();
    oPersian.year = iYear + BASE_YEAR$1;
    return this._setPersian(oPersian);
};
Persian.prototype.setFullYear = function (iYear, iMonth, iDay) {
    var oPersian = this._getPersian();
    oPersian.year = iYear;
    if (iMonth !== undefined) {
        oPersian.month = iMonth;
    }
    if (iDay !== undefined) {
        oPersian.day = iDay;
    }
    return this._setPersian(oPersian);
};
Persian.prototype.getUTCDate = function (iDate) {
    return this._getUTCPersian().day;
};
Persian.prototype.getUTCMonth = function () {
    return this._getUTCPersian().month;
};
Persian.prototype.getUTCFullYear = function () {
    return this._getUTCPersian().year;
};
Persian.prototype.setUTCDate = function (iDate) {
    var oPersian = this._getUTCPersian();
    oPersian.day = iDate;
    return this._setUTCPersian(oPersian);
};
Persian.prototype.setUTCMonth = function (iMonth, iDay) {
    var oPersian = this._getUTCPersian();
    oPersian.month = iMonth;
    if (iDay !== undefined) {
        oPersian.day = iDay;
    }
    return this._setUTCPersian(oPersian);
};
Persian.prototype.setUTCFullYear = function (iYear, iMonth, iDay) {
    var oPersian = this._getUTCPersian();
    oPersian.year = iYear;
    if (iMonth !== undefined) {
        oPersian.month = iMonth;
    }
    if (iDay !== undefined) {
        oPersian.day = iDay;
    }
    return this._setUTCPersian(oPersian);
};
CalendarClassRegistry.setCalendarClass(CalendarType.Persian, Persian);

// Shorthands
const w = window;

// Map of observer objects per dom node
const observers = new WeakMap();

/**
 * Implements universal DOM node observation methods.
 */
class DOMObserver {
	constructor() {
		throw new Error("Static class");
	}

	/**
	 * This function abstracts out mutation observer usage inside shadow DOM.
	 * For native shadow DOM the native mutation observer is used.
	 * When the polyfill is used, the observeChildren ShadyDOM method is used instead.
	 *
	 * @throws Exception
	 * Note: does not allow several mutation observers per node. If there is a valid use-case, this behavior can be changed.
	 *
	 * @param node
	 * @param callback
	 * @param options - Only used for the native mutation observer
	 */
	static observeDOMNode(node, callback, options) {
		let observerObject = observers.get(node);
		if (observerObject) {
			throw new Error("A mutation/ShadyDOM observer is already assigned to this node.");
		}

		if (w.ShadyDOM) {
			observerObject = w.ShadyDOM.observeChildren(node, callback);
		} else {
			observerObject = new MutationObserver(callback);
			observerObject.observe(node, options);
		}

		observers.set(node, observerObject);
	}

	/**
	 * De-registers the mutation observer, depending on its type
	 * @param node
	 */
	static unobserveDOMNode(node) {
		const observerObject = observers.get(node);
		if (!observerObject) {
			return;
		}

		if (observerObject instanceof MutationObserver) {
			observerObject.disconnect();
		} else {
			w.ShadyDOM.unobserveChildren(observerObject);
		}
		observers.delete(node);
	}
}

/**
 * Base class for all data types.
 *
 * @class
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.base.types.DataType
 * @public
 */
class DataType {
	static isValid(value) {
	}

	static generataTypeAcessors(types) {
		Object.keys(types).forEach(type => {
			Object.defineProperty(this, type, {
				get() {
					return types[type];
				},
			});
		});
	}
}

class UI5ElementMetadata {
	constructor(metadata) {
		this.metadata = metadata;
	}

	getTag() {
		return this.metadata.tag;
	}

	getNoShadowDOM() {
		return this.metadata.noShadowDOM;
	}

	getDefaultSlot() {
		return this.metadata.defaultSlot || "content";
	}

	getPropsList() {
		return Object.keys(this.getProperties());
	}

	getPublicPropsList() {
		return this.getPropsList().filter(UI5ElementMetadata.isPublicProperty);
	}

	getSlots() {
		return this.metadata.slots || {};
	}

	hasSlots() {
		return !!Object.entries(this.getSlots()).length;
	}

	getProperties() {
		return this.metadata.properties || {};
	}

	getEvents() {
		return this.metadata.events || {};
	}

	static isPublicProperty(prop) {
		return prop.charAt(0) !== "_";
	}

	static validatePropertyValue(value, propData) {
		const isMultiple = propData.multiple;
		if (isMultiple) {
			return value.map(propValue => validateSingleProperty(propValue, propData));
		}
		return validateSingleProperty(value, propData);
	}

	static validateSlotValue(value, slotData) {
		return validateSingleSlot(value, slotData);
	}
}

const validateSingleProperty = (value, propData) => {
	const propertyType = propData.type;

	// Association handling
	if (propData.association) {
		return value;
	}

	if (propertyType === Boolean) {
		return typeof value === "boolean" ? value : false;
	}
	if (propertyType === String) {
		return (typeof value === "string" || typeof value === "undefined" || value === null) ? value : value.toString();
	}
	if (propertyType === Object) {
		return typeof value === "object" ? value : propData.defaultValue;
	}
	if (isDescendantOf(propertyType, DataType)) {
		return propertyType.isValid(value) ? value : propData.defaultValue;
	}
};

const validateSingleSlot = (value, slotData) => {
	if (value === null) {
		return value;
	}

	const getSlottedNodes = el => {
		const isTag = el instanceof HTMLElement;
		const isSlot = isTag && el.tagName.toUpperCase() === "SLOT";

		if (isSlot) {
			return el.assignedNodes({ flatten: true }).filter(item => item instanceof HTMLElement);
		}

		return [el];
	};
	const propertyType = slotData.type;

	const slottedNodes = getSlottedNodes(value);
	slottedNodes.forEach(el => {
		if (!(el instanceof propertyType)) {
			const isHTMLElement = el instanceof HTMLElement;
			const tagName = isHTMLElement && el.tagName.toLowerCase();
			const isCustomElement = isHTMLElement && tagName.includes("-");
			if (isCustomElement) {
				window.customElements.whenDefined(tagName).then(() => {
					if (!(el instanceof propertyType)) {
						throw new Error(`${el} is not of type ${propertyType}`);
					}
				});
			}
		}
	});

	return value;
};

const isDescendantOf = (klass, baseKlass, inclusive = false) => {
	if (typeof klass !== "function" || typeof baseKlass !== "function") {
		return false;
	}
	if (inclusive && klass === baseKlass) {
		return true;
	}
	let parent = klass;
	do {
		parent = Object.getPrototypeOf(parent);
	} while (parent !== null && parent !== baseKlass);
	return parent === baseKlass;
};

class Integer extends DataType {
	static isValid(value) {
		return Number.isInteger(value);
	}
}

class RenderQueue {
	constructor() {
		this.list = []; // Used to store the web components in order
		this.promises = new Map(); // Used to store promises for web component rendering
	}

	add(webComponent) {
		if (this.promises.has(webComponent)) {
			return this.promises.get(webComponent);
		}

		let deferredResolve;
		const promise = new Promise(resolve => {
			deferredResolve = resolve;
		});
		promise._deferredResolve = deferredResolve;

		this.list.push(webComponent);
		this.promises.set(webComponent, promise);

		return promise;
	}

	shift() {
		const webComponent = this.list.shift();
		if (webComponent) {
			const promise = this.promises.get(webComponent);
			this.promises.delete(webComponent);
			return { webComponent, promise };
		}
	}

	getList() {
		return this.list;
	}

	isAdded(webComponent) {
		return this.promises.has(webComponent);
	}
}

const MAX_RERENDER_COUNT = 10;

// Tells whether a render task is currently scheduled
let renderTaskId;

// Queue for invalidated web components
const invalidatedWebComponents = new RenderQueue();

let renderTaskPromise,
	renderTaskPromiseResolve,
	taskResult;

/**
 * Class that manages the rendering/re-rendering of web components
 * This is always asynchronous
 */
class RenderScheduler {
	constructor() {
		throw new Error("Static class");
	}

	/**
	 * Queues a web component for re-rendering
	 * @param webComponent
	 */
	static renderDeferred(webComponent) {
		// Enqueue the web component
		const res = invalidatedWebComponents.add(webComponent);

		// Schedule a rendering task
		RenderScheduler.scheduleRenderTask();
		return res;
	}

	static renderImmediately(webComponent) {
		// Enqueue the web component
		const res = invalidatedWebComponents.add(webComponent);

		// Immediately start a render task
		RenderScheduler.runRenderTask();
		return res;
	}

	/**
	 * Schedules a rendering task, if not scheduled already
	 */
	static scheduleRenderTask() {
		if (!renderTaskId) {
			// renderTaskId = window.setTimeout(RenderScheduler.renderWebComponents, 3000); // Task
			// renderTaskId = Promise.resolve().then(RenderScheduler.renderWebComponents); // Micro task
			renderTaskId = window.requestAnimationFrame(RenderScheduler.renderWebComponents); // AF
		}
	}

	static runRenderTask() {
		if (!renderTaskId) {
			renderTaskId = 1; // prevent another rendering task from being scheduled, all web components should use this task
			RenderScheduler.renderWebComponents();
		}
	}

	static renderWebComponents() {
		// console.log("------------- NEW RENDER TASK ---------------");

		let webComponentInfo,
			webComponent,
			promise;
		const renderStats = new Map();
		while (webComponentInfo = invalidatedWebComponents.shift()) { // eslint-disable-line
			webComponent = webComponentInfo.webComponent;
			promise = webComponentInfo.promise;

			const timesRerendered = renderStats.get(webComponent) || 0;
			if (timesRerendered > MAX_RERENDER_COUNT) {
				// console.warn("WARNING RERENDER", webComponent);
				throw new Error(`Web component re-rendered too many times this task, max allowed is: ${MAX_RERENDER_COUNT}`);
			}
			webComponent._render();
			promise._deferredResolve();
			renderStats.set(webComponent, timesRerendered + 1);
		}

		// wait for Mutation observer just in case
		setTimeout(() => {
			if (invalidatedWebComponents.getList().length === 0) {
				RenderScheduler._resolveTaskPromise();
			}
		}, 200);

		renderTaskId = undefined;
	}

	/**
	 * return a promise that will be resolved once all invalidated web components are rendered
	 */
	static whenDOMUpdated() {
		if (renderTaskPromise) {
			return renderTaskPromise;
		}

		renderTaskPromise = new Promise(resolve => {
			renderTaskPromiseResolve = resolve;
			window.requestAnimationFrame(() => {
				if (invalidatedWebComponents.getList().length === 0) {
					renderTaskPromise = undefined;
					resolve();
				}
			});
		});

		return renderTaskPromise;
	}

	static getNotDefinedComponents() {
		return Array.from(document.querySelectorAll(":not(:defined)")).filter(el => el.localName.startsWith("ui5-"));
	}

	/**
	 * return a promise that will be resolved once all ui5 webcomponents on the page have their shadow root ready
	 */
	static async whenShadowDOMReady() {
		const undefinedElements = this.getNotDefinedComponents();

		const definedPromises = undefinedElements.map(
		  el => customElements.whenDefined(el.localName)
		);
		const timeoutPromise = new Promise(resolve => setTimeout(resolve, 5000));

		await Promise.race([Promise.all(definedPromises), timeoutPromise]);
		const stillUndefined = this.getNotDefinedComponents();
		if (stillUndefined.length) {
			// eslint-disable-next-line
			console.warn("undefined elements after 5 seconds: ", [...stillUndefined].map(el => el.localName));
		}

		// TODO: track promises internally, the dom traversal is a POC only
		const ui5Components = Array.from(document.querySelectorAll("*")).filter(_ => _._shadowRootReadyPromise);
		return Promise.all(ui5Components.map(comp => comp._whenShadowRootReady()))
			.then(() => Promise.resolve());	// qunit has a boolean cheack for the promise value and the array from the Promise all is considered truthy
	}

	static async whenFinished() {
		await RenderScheduler.whenShadowDOMReady();
		await RenderScheduler.whenDOMUpdated();
	}

	static _resolveTaskPromise() {
		if (invalidatedWebComponents.getList().length > 0) {
			// More updates are pending. Resolve will be called again
			return;
		}

		if (renderTaskPromiseResolve) {
			renderTaskPromiseResolve.call(this, taskResult);
			renderTaskPromiseResolve = undefined;
			renderTaskPromise = undefined;
		}
	}
}

const customCSSFor = {};

const addCustomCSS = (tag, css, ...rest) => {
	// TODO remove deprecation error after 1 release
	if (rest.length) {
		throw new Error("addCustomCSS no longer accepts theme specific CSS. new signature is `addCustomCSS(tag, css)`");
	}

	if (!customCSSFor[tag]) {
		customCSSFor[tag] = [];
	}

	customCSSFor[tag].push(css);
};

const getCustomCSS = tag => {
	return customCSSFor[tag] ? customCSSFor[tag].join("") : "";
};

/**
 * Creates a <style> tag in the <head> tag
 * @param cssText - the CSS
 * @param attributes - optional attributes to add to the tag
 * @returns {HTMLElement}
 */
const createStyleInHead = (cssText, attributes = {}) => {
	const style = document.createElement("style");
	style.type = "text/css";

	Object.entries(attributes).forEach(pair => style.setAttribute(...pair));

	style.textContent = cssText;
	document.head.appendChild(style);
	return style;
};

const injectedForTags = [];
let ponyfillTimer;

const ponyfillNeeded = () => !!window.CSSVarsPonyfill;

const runPonyfill = () => {
	ponyfillTimer = undefined;

	window.CSSVarsPonyfill.resetCssVars();
	window.CSSVarsPonyfill.cssVars({
		rootElement: document.head,
		include: "style[data-ui5-webcomponents-theme-properties],style[data-ui5-webcomponent-styles]",
		silent: true,
	});
};

const schedulePonyfill = () => {
	if (!ponyfillTimer) {
		ponyfillTimer = window.setTimeout(runPonyfill, 0);
	}
};

/**
 * Creates/updates a style element holding all CSS Custom Properties
 * @param cssText
 */
const injectThemeProperties = cssText => {
	// Needed for all browsers
	const styleElement = document.head.querySelector(`style[data-ui5-webcomponents-theme-properties]`);
	if (styleElement) {
		styleElement.textContent = cssText || "";	// in case of undefined
	} else {
		createStyleInHead(cssText, { "data-ui5-webcomponents-theme-properties": "" });
	}

	// When changing the theme, run the ponyfill immediately
	if (ponyfillNeeded()) {
		runPonyfill();
	}
};

/**
 * Creates a style element holding the CSS for a web component (and resolves CSS Custom Properties for IE)
 * @param tagName
 * @param cssText
 */
const injectWebComponentStyle = (tagName, cssText) => {
	// Edge and IE
	if (injectedForTags.indexOf(tagName) !== -1) {
		return;
	}
	createStyleInHead(cssText, {
		"data-ui5-webcomponent-styles": tagName,
		"disabled": "disabled",
	});
	injectedForTags.push(tagName);

	// When injecting component styles, more might come in the same tick, so run the ponyfill async (to avoid double work)
	if (ponyfillNeeded()) {
		schedulePonyfill();
	}
};

const themeChangeCallbacks = [];

const getDefaultTheme = () => {
	return "sap_fiori_3";
};

const attachThemeChange = function attachThemeChange(callback) {
	if (themeChangeCallbacks.indexOf(callback) === -1) {
		themeChangeCallbacks.push(callback);
	}
};

const applyTheme = async () => {
	let cssText = "";
	const theme = getTheme();

	const defaultTheme = getDefaultTheme();
	if (theme !== defaultTheme) {
		cssText = await getThemeProperties("@ui5/webcomponents", theme);
	}
	injectThemeProperties(cssText);
};

const setTheme = async theme => {
	if (theme === getTheme()) {
		return;
	}

	// Update configuration
	_setTheme(theme);

	// Update CSS Custom Properties
	await applyTheme();

	themeChangeCallbacks.forEach(callback => callback(theme));
};

const getEffectiveStyle = ElementClass => {
	const tag = ElementClass.getMetadata().getTag();
	const customStyle = getCustomCSS(tag) || "";
	let componentStyles = ElementClass.styles;

	if (Array.isArray(componentStyles)) {
		componentStyles = componentStyles.join(" ");
	}
	return `${componentStyles} ${customStyle}`;
};

var Theming = /*#__PURE__*/Object.freeze({
    getDefaultTheme: getDefaultTheme,
    attachThemeChange: attachThemeChange,
    applyTheme: applyTheme,
    setTheme: setTheme,
    getEffectiveStyle: getEffectiveStyle,
    addCustomCSS: addCustomCSS
});

const styleMap = new Map();

/**
 * Creates the needed CSS for a web component class in the head tag
 * Note: IE11, Edge
 * @param ElementClass
 */
const createHeadStyle = ElementClass => {
	const tag = ElementClass.getMetadata().getTag();
	const cssContent = getEffectiveStyle(ElementClass);
	injectWebComponentStyle(tag, cssContent);
};

/**
 * Returns (and caches) a constructable style sheet for a web component class
 * Note: Chrome
 * @param ElementClass
 * @returns {*}
 */
const getConstructableStyle = ElementClass => {
	const tagName = ElementClass.getMetadata().getTag();
	const styleContent = getEffectiveStyle(ElementClass);
	const theme = getTheme();
	const key = theme + tagName;
	if (styleMap.has(key)) {
		return styleMap.get(key);
	}

	const style = new CSSStyleSheet();
	style.replaceSync(styleContent);

	styleMap.set(key, style);
	return style;
};

/**
 * Returns the CSS to be injected inside a web component shadow root, or undefined if not needed
 * Note: FF, Safari
 * @param ElementClass
 * @returns {string}
 */
const getShadowRootStyle = ElementClass => {
	if (document.adoptedStyleSheets || window.ShadyDOM) {
		return;
	}

	const styleContent = getEffectiveStyle(ElementClass);
	return styleContent;
};

const metadata = {
	events: {
		_propertyChange: {},
	},
};

const DefinitionsSet = new Set();
const IDMap = new Map();

class UI5Element extends HTMLElement {
	constructor() {
		super();
		this._generateId();
		this._initializeState();
		this._upgradeAllProperties();
		this._shadowRootReadyPromise = this._initializeShadowRoot();

		attachThemeChange(this.onThemeChanged.bind(this));

		let deferredResolve;
		this._domRefReadyPromise = new Promise(resolve => {
			deferredResolve = resolve;
		});
		this._domRefReadyPromise._deferredResolve = deferredResolve;

		this._monitoredChildProps = new Map();
	}

	_whenShadowRootReady() {
		return this._shadowRootReadyPromise;
	}

	onThemeChanged() {
		if (window.ShadyDOM) {
			// polyfill theme handling is in head styles directly
			return;
		}
		const newStyle = getConstructableStyle(this.constructor);
		if (document.adoptedStyleSheets) {
			this.shadowRoot.adoptedStyleSheets = [newStyle];
		} else {
			const oldStyle = this.shadowRoot.querySelector("style");
			oldStyle.textContent = newStyle.textContent;
		}
	}

	_generateId() {
		this._id = this.constructor._nextID();
	}

	async _initializeShadowRoot() {
		if (this.constructor.getMetadata().getNoShadowDOM()) {
			return Promise.resolve();
		}

		this.attachShadow({ mode: "open" });

		// IE11, Edge
		if (window.ShadyDOM) {
			createHeadStyle(this.constructor);
		}

		// Chrome
		if (document.adoptedStyleSheets) {
			const style = getConstructableStyle(this.constructor);
			this.shadowRoot.adoptedStyleSheets = [style];
		}
	}

	async connectedCallback() {
		const isCompact = getCompactSize();
		if (isCompact) {
			this.setAttribute("data-ui5-compact-size", "");
		}

		if (this.constructor.getMetadata().getNoShadowDOM()) {
			return;
		}

		await this._whenShadowRootReady();
		this._processChildren();
		await RenderScheduler.renderImmediately(this);
		this._domRefReadyPromise._deferredResolve();
		this._startObservingDOMChildren();
		if (typeof this.onEnterDOM === "function") {
			this.onEnterDOM();
		}
	}

	disconnectedCallback() {
		if (this.constructor.getMetadata().getNoShadowDOM()) {
			return;
		}

		this._stopObservingDOMChildren();
		if (typeof this.onExitDOM === "function") {
			this.onExitDOM();
		}
	}

	_startObservingDOMChildren() {
		const shouldObserveChildren = this.constructor.getMetadata().hasSlots();
		if (!shouldObserveChildren) {
			return;
		}
		const mutationObserverOptions = {
			childList: true,
			subtree: true,
			characterData: true,
		};
		DOMObserver.observeDOMNode(this, this._processChildren.bind(this), mutationObserverOptions);
	}

	_stopObservingDOMChildren() {
		DOMObserver.unobserveDOMNode(this);
	}

	onChildrenChanged(mutations) {
	}

	_processChildren(mutations) {
		const hasSlots = this.constructor.getMetadata().hasSlots();
		if (hasSlots) {
			this._updateSlots();
		}
		this.onChildrenChanged(mutations);
	}

	_updateSlots() {
		const slotsMap = this.constructor.getMetadata().getSlots();
		const defaultSlot = this.constructor.getMetadata().getDefaultSlot();
		const canSlotText = slotsMap[defaultSlot] !== undefined && slotsMap[defaultSlot].type === Node;

		let domChildren;
		if (canSlotText) {
			domChildren = Array.from(this.childNodes);
		} else {
			domChildren = Array.from(this.children);
		}

		// Init the _state object based on the supported slots
		for (const [slot, slotData] of Object.entries(slotsMap)) { // eslint-disable-line
			this._clearSlot(slot);
		}

		const autoIncrementMap = new Map();
		domChildren.forEach(child => {
			// Determine the type of the child (mainly by the slot attribute)
			const slotName = this.constructor._getSlotName(child);

			// Check if the slotName is supported
			if (slotsMap[slotName] === undefined) {
				const validValues = Object.keys(slotsMap).join(", ");
				console.warn(`Unknown slotName: ${slotName}, ignoring`, child, `Valid values are: ${validValues}`); // eslint-disable-line
				return;
			}

			// For children that need individual slots, calculate them
			if (slotsMap[slotName].individualSlots) {
				const nextId = (autoIncrementMap.get(slotName) || 0) + 1;
				autoIncrementMap.set(slotName, nextId);
				child._individualSlot = `${slotName}-${nextId}`;
			}

			// Distribute the child in the _state object
			child = this._prepareForSlot(slotName, child);
			if (slotsMap[slotName].multiple) {
				this._state[slotName].push(child);
			} else {
				this._state[slotName] = child;
			}
		});

		this._invalidate();
	}

	// Removes all children from the slot and detaches listeners, if any
	_clearSlot(slot) {
		const slotData = this.constructor.getMetadata().getSlots()[slot];

		let children = this._state[slot];
		if (!Array.isArray(children)) {
			children = [children];
		}

		children.forEach(child => {
			if (child && child._attachChildPropertyUpdated) {
				this._detachChildPropertyUpdated(child);
			}
		});

		if (slotData.multiple) {
			this._state[slot] = [];
		} else {
			this._state[slot] = null;
		}
	}

	_prepareForSlot(slot, child) {
		const slotData = this.constructor.getMetadata().getSlots()[slot];
		child = this.constructor.getMetadata().constructor.validateSlotValue(child, slotData);

		if (child._attachChildPropertyUpdated) {
			this._attachChildPropertyUpdated(child, slotData);
		}

		return child;
	}

	static get observedAttributes() {
		const observedProps = this.getMetadata().getPublicPropsList();
		return observedProps.map(camelToKebabCase);
	}

	attributeChangedCallback(name, oldValue, newValue) {
		const properties = this.constructor.getMetadata().getProperties();
		const realName = name.replace(/^ui5-/, "");
		const nameInCamelCase = kebabToCamelCase(realName);
		if (properties.hasOwnProperty(nameInCamelCase)) { // eslint-disable-line
			const propertyTypeClass = properties[nameInCamelCase].type;
			if (propertyTypeClass === Boolean) {
				newValue = newValue !== null;
			}
			if (propertyTypeClass === Integer) {
				newValue = parseInt(newValue);
			}
			this[nameInCamelCase] = newValue;
		}
	}

	_updateAttribute(name, newValue) {
		if (!UI5ElementMetadata.isPublicProperty(name)) {
			return;
		}

		if (typeof newValue === "object") {
			return;
		}

		const attrName = camelToKebabCase(name);
		const attrValue = this.getAttribute(attrName);
		if (typeof newValue === "boolean") {
			if (newValue === true && attrValue === null) {
				this.setAttribute(attrName, "");
			} else if (newValue === false && attrValue !== null) {
				this.removeAttribute(attrName);
			}
		} else if (attrValue !== newValue) {
			this.setAttribute(attrName, newValue);
		}
	}

	_upgradeProperty(prop) {
		if (this.hasOwnProperty(prop)) { // eslint-disable-line
			const value = this[prop];
			delete this[prop];
			this[prop] = value;
		}
	}

	_upgradeAllProperties() {
		const allProps = this.constructor.getMetadata().getPropsList();
		allProps.forEach(this._upgradeProperty.bind(this));
	}

	static define() {
		const tag = this.getMetadata().getTag();

		const definedLocally = DefinitionsSet.has(tag);
		const definedGlobally = customElements.get(tag);

		if (definedGlobally && !definedLocally) {
			console.warn(`Skipping definition of tag ${tag}, because it was already defined by another instance of ui5-webcomponents.`); // eslint-disable-line
		} else if (!definedGlobally) {
			this.generateAccessors();
			DefinitionsSet.add(tag);
			window.customElements.define(tag, this);
		}
		return this;
	}

	static get metadata() {
		return metadata;
	}

	static get styles() {
		return "";
	}

	_initializeState() {
		const defaultState = this.constructor._getDefaultState();
		this._state = Object.assign({}, defaultState);
		this._delegates = [];
	}

	static getMetadata() {
		let klass = this; // eslint-disable-line

		if (klass.hasOwnProperty("_metadata")) { // eslint-disable-line
			return klass._metadata;
		}

		const metadatas = [Object.assign(klass.metadata, {})];
		while (klass !== UI5Element) {
			klass = Object.getPrototypeOf(klass);
			metadatas.push(klass.metadata);
		}

		const result = metadatas[0];

		// merge properties
		result.properties = metadatas.reverse().reduce((result, current) => { // eslint-disable-line
			Object.assign(result, current.properties);
			return result;
		}, {});

		// merge slots
		result.slots = metadatas.reverse().reduce((result, current) => { // eslint-disable-line
			Object.assign(result, current.slots);
			return result;
		}, {});

		// merge events
		result.events = metadatas.reverse().reduce((result, current) => { // eslint-disable-line
			Object.assign(result, current.events);
			return result;
		}, {});

		this._metadata = new UI5ElementMetadata(result);
		return this._metadata;
	}

	_attachChildPropertyUpdated(child, propData) {
		const listenFor = propData.listenFor,
			childMetadata = child.constructor.getMetadata(),
			slotName = this.constructor._getSlotName(child), // all slotted children have the same configuration
			childProperties = childMetadata.getProperties();

		let observedProps = [],
			notObservedProps = [];

		if (!listenFor) {
			return;
		}

		if (Array.isArray(listenFor)) {
			observedProps = listenFor;
		} else {
			observedProps = Array.isArray(listenFor.props) ? listenFor.props : Object.keys(childProperties);
			notObservedProps = Array.isArray(listenFor.exclude) ? listenFor.exclude : [];
		}

		if (!this._monitoredChildProps.has(slotName)) {
			this._monitoredChildProps.set(slotName, { observedProps, notObservedProps });
		}

		child.addEventListener("_propertyChange", this._invalidateParentOfPropertyUpdate);
	}

	_detachChildPropertyUpdated(child) {
		child.removeEventListener("_propertyChange", this._invalidateParentOfPropertyUpdate);
	}

	_invalidateParentOfPropertyUpdate(prop) {
		// The web component to be invalidated
		const parentNode = this.parentNode;
		if (!parentNode) {
			return;
		}

		const slotName = parentNode.constructor._getSlotName(this);
		const propsMetadata = parentNode._monitoredChildProps.get(slotName);

		if (!propsMetadata) {
			return;
		}
		const { observedProps, notObservedProps } = propsMetadata;

		if (observedProps.includes(prop.detail.name) && !notObservedProps.includes(prop.detail.name)) {
			parentNode._invalidate("_parent_", this);
		}
	}

	/**
	 * Asynchronously re-renders an already rendered web component
	 * @private
	 */
	_invalidate() {
		if (this._invalidated) {
			return;
		}

		if (this.getDomRef() && !this._suppressInvalidation) {
			this._invalidated = true;
			// console.log("INVAL", this, ...arguments);
			RenderScheduler.renderDeferred(this);
		}
	}

	_render() {
		// Call the onBeforeRendering hook
		if (typeof this.onBeforeRendering === "function") {
			this._suppressInvalidation = true;
			this.onBeforeRendering();
			delete this._suppressInvalidation;
		}

		// Update the shadow root with the render result
		// console.log(this.getDomRef() ? "RE-RENDER" : "FIRST RENDER", this);
		delete this._invalidated;
		this._updateShadowRoot();

		// Safari requires that children get the slot attribute only after the slot tags have been rendered in the shadow DOM
		this._assignSlotsToChildren();

		// Call the onAfterRendering hook
		if (typeof this.onAfterRendering === "function") {
			this.onAfterRendering();
		}
	}

	_updateShadowRoot() {
		const renderResult = this.constructor.template(this);
		// For browsers that do not support constructable style sheets (and not using the polyfill)
		const styleToPrepend = getShadowRootStyle(this.constructor);
		this.constructor.render(renderResult, this.shadowRoot, styleToPrepend, { eventContext: this });
	}

	_assignSlotsToChildren() {
		const defaultSlot = this.constructor.getMetadata().getDefaultSlot();
		const domChildren = Array.from(this.children);

		domChildren.forEach(child => {
			const slotName = this.constructor._getSlotName(child);
			const slot = child.getAttribute("slot");
			const hasSlot = !!slot;

			// Assign individual slots, f.e. items => items-1
			if (child._individualSlot) {
				child.setAttribute("slot", child._individualSlot);
				return;
			}

			// If the user set a slot equal to the default slot, f.e. slot="content", remove it
			// Otherwise, stop here
			if (slotName === defaultSlot) {
				if (hasSlot) {
					child.removeAttribute("slot");
				}
				return;
			}

			// Compatibility - for the ones with "data-ui5-slot"
			// If they don't have a slot yet, and are not of the default child type, set slotName as slot
			if (!hasSlot) {
				child.setAttribute("slot", slotName);
			}
		}, this);


		domChildren.filter(child => child._compatibilitySlot).forEach(child => {
			const hasSlot = !!child.getAttribute("slot");
			const needsSlot = child._compatibilitySlot !== defaultSlot;
			if (!hasSlot && needsSlot) {
				child.setAttribute("slot", child._compatibilitySlot);
			}
		});
	}

	getDomRef() {
		if (!this.shadowRoot || this.shadowRoot.children.length === 0) {
			return;
		}

		return this.shadowRoot.children.length === 1
			? this.shadowRoot.children[0] : this.shadowRoot.children[1];
	}

	_waitForDomRef() {
		return this._domRefReadyPromise;
	}

	getFocusDomRef() {
		const domRef = this.getDomRef();
		if (domRef) {
			const focusRef = domRef.querySelector("[data-sap-focus-ref]");
			return focusRef || domRef;
		}
	}

	async focus() {
		await this._waitForDomRef();

		const focusDomRef = this.getFocusDomRef();

		if (focusDomRef) {
			focusDomRef.focus();
		}
	}

	/**
	 * Calls the event handler on the web component for a native event
	 *
	 * @param event The event object
	 * @private
	 */
	_handleEvent(event) {
		const sHandlerName = `on${event.type}`;

		this._delegates.forEach(delegate => {
			if (delegate[sHandlerName]) {
				delegate[sHandlerName](event);
			}
		});

		if (this[sHandlerName]) {
			this[sHandlerName](event);
		}
	}

	_propertyChange(name, value) {
		this._updateAttribute(name, value);

		const customEvent = new CustomEvent("_propertyChange", {
			detail: { name, newValue: value },
			composed: false,
			bubbles: true,
		});

		this.dispatchEvent(customEvent);
	}

	/**
	 *
	 * @param name - name of the event
	 * @param data - additional data for the event
	 * @param cancelable - true, if the user can call preventDefault on the event object
	 * @returns {boolean} false, if the event was cancelled (preventDefault called), true otherwise
	 */
	fireEvent(name, data, cancelable) {
		let compatEventResult = true; // Initialized to true, because if the event is not fired at all, it should be considered "not-prevented"
		const noConflict = getWCNoConflict();

		const noConflictEvent = new CustomEvent(`ui5-${name}`, {
			detail: data,
			composed: false,
			bubbles: true,
			cancelable,
		});

		// This will be false if the compat event is prevented
		compatEventResult = this.dispatchEvent(noConflictEvent);

		if (noConflict === true || (noConflict.events && noConflict.events.includes && noConflict.events.includes(name))) {
			return compatEventResult;
		}

		const customEvent = new CustomEvent(name, {
			detail: data,
			composed: false,
			bubbles: true,
			cancelable,
		});

		// This will be false if the normal event is prevented
		const normalEventResult = this.dispatchEvent(customEvent);

		// Return false if any of the two events was prevented (its result was false).
		return normalEventResult && compatEventResult;
	}

	getSlottedNodes(slotName) {
		const reducer = (acc, curr) => {
			if (curr.tagName.toUpperCase() !== "SLOT") {
				return acc.concat([curr]);
			}
			return acc.concat(curr.assignedNodes({ flatten: true }).filter(item => item instanceof HTMLElement));
		};

		return this[slotName].reduce(reducer, []);
	}

	/**
	 * Used to generate the next auto-increment id for the current class
	 * @returns {string}
	 * @private
	 */
	static _nextID() {
		const className = "el";
		const lastNumber = IDMap.get(className);
		const nextNumber = lastNumber !== undefined ? lastNumber + 1 : 1;
		IDMap.set(className, nextNumber);
		return `__${className}${nextNumber}`;
	}

	static _getSlotName(child) {
		const defaultSlot = this.getMetadata().getDefaultSlot();

		// Text nodes can only go to the default slot
		if (!(child instanceof HTMLElement)) {
			return defaultSlot;
		}

		// Check for explicitly given logical slot - for backward compatibility, should not be used
		const ui5Slot = child.getAttribute("data-ui5-slot");
		if (ui5Slot) {
			return ui5Slot;
		}

		// Discover the slot based on the real slot name (f.e. footer => footer, or content-32 => content)
		const slot = child.getAttribute("slot");
		if (slot) {
			const match = slot.match(/^(.+?)-\d+$/);
			return match ? match[1] : slot;
		}

		// Use default slot as a fallback
		return defaultSlot;
	}

	static _getDefaultState() {
		if (this._defaultState) {
			return this._defaultState;
		}

		const MetadataClass = this.getMetadata();
		const defaultState = {};

		// Initialize properties
		const props = MetadataClass.getProperties();
		for (const propName in props) { // eslint-disable-line
			const propType = props[propName].type;
			const propDefaultValue = props[propName].defaultValue;

			if (propType === Boolean) {
				defaultState[propName] = false;

				if (propDefaultValue !== undefined) {
					console.warn("The 'defaultValue' metadata key is ignored for all booleans properties, they would be initialized with 'false' by default"); // eslint-disable-line
				}
			} else if (props[propName].multiple) {
				defaultState[propName] = [];
			} else if (propType === Object) {
				defaultState[propName] = "defaultValue" in props[propName] ? props[propName].defaultValue : {};
			} else if (propType === String) {
				defaultState[propName] = propDefaultValue || "";
			} else {
				defaultState[propName] = propDefaultValue;
			}
		}

		// Initialize slots
		const slots = MetadataClass.getSlots();
		for (const slotName in slots) { // eslint-disable-line
			if (slots[slotName].multiple) {
				defaultState[slotName] = [];
			} else {
				defaultState[slotName] = null;
			}
		}

		this._defaultState = defaultState;
		return defaultState;
	}

	static generateAccessors() {
		const proto = this.prototype;

		// Properties
		const properties = this.getMetadata().getProperties();
		for (const [prop, propData] of Object.entries(properties)) { // eslint-disable-line
			if (nameCollidesWithNative(prop)) {
				throw new Error(`"${prop}" is not a valid property name. Use a name that does not collide with DOM APIs`);
			}

			if (propData.type === "boolean" && propData.defaultValue) {
				throw new Error(`Cannot set a default value for property "${prop}". All booleans are false by default.`);
			}

			Object.defineProperty(proto, prop, {
				get() {
					if (this._state[prop] !== undefined) {
						return this._state[prop];
					}

					const propDefaultValue = propData.defaultValue;

					if (propData.type === Boolean) {
						return false;
					} else if (propData.type === String) {  // eslint-disable-line
						return propDefaultValue || "";
					} else if (propData.multiple) { // eslint-disable-line
						return [];
					} else {
						return propDefaultValue;
					}
				},
				set(value) {
					let isDifferent = false;
					value = this.constructor.getMetadata().constructor.validatePropertyValue(value, propData);

					const oldState = this._state[prop];

					if (propData.deepEqual) {
						isDifferent = JSON.stringify(oldState) !== JSON.stringify(value);
					} else {
						isDifferent = oldState !== value;
					}

					if (isDifferent) {
						this._state[prop] = value;
						if (propData.nonVisual) {
							return;
						}
						this._invalidate(prop, value);
						this._propertyChange(prop, value);
					}
				},
			});
		}

		// Slots
		const slots = this.getMetadata().getSlots();
		for (const [slot, slotData] of Object.entries(slots)) { // eslint-disable-line
			if (nameCollidesWithNative(slot)) {
				throw new Error(`"${slot}" is not a valid property name. Use a name that does not collide with DOM APIs`);
			}

			Object.defineProperty(proto, slot, {
				get() {
					if (this._state[slot] !== undefined) {
						return this._state[slot];
					}
					if (slotData.multiple) {
						return [];
					}
					return null;
				},
				set() {
					throw new Error("Cannot set slots directly, use the DOM APIs");
				},
			});
		}
	}
}
const kebabToCamelCase = string => toCamelCase(string.split("-"));
const camelToKebabCase = string => string.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
const toCamelCase = parts => {
	return parts.map((string, index) => {
		return index === 0 ? string.toLowerCase() : string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
	}).join("");
};
const nameCollidesWithNative = name => {
	if (name === "disabled") {
		return false;
	}
	const classes = [
		HTMLElement,
		Element,
		Node,
	];
	return classes.some(klass => klass.prototype.hasOwnProperty(name)); // eslint-disable-line
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const directives = new WeakMap();
/**
 * Brands a function as a directive so that lit-html will call the function
 * during template rendering, rather than passing as a value.
 *
 * @param f The directive factory function. Must be a function that returns a
 * function of the signature `(part: Part) => void`. The returned function will
 * be called with the part object
 *
 * @example
 *
 * ```
 * import {directive, html} from 'lit-html';
 *
 * const immutable = directive((v) => (part) => {
 *   if (part.value !== v) {
 *     part.setValue(v)
 *   }
 * });
 * ```
 */
// tslint:disable-next-line:no-any
const directive = (f) => ((...args) => {
    const d = f(...args);
    directives.set(d, true);
    return d;
});
const isDirective = (o) => {
    return typeof o === 'function' && directives.has(o);
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * True if the custom elements polyfill is in use.
 */
const isCEPolyfill = window.customElements !== undefined &&
    window.customElements.polyfillWrapFlushCallback !==
        undefined;
/**
 * Reparents nodes, starting from `startNode` (inclusive) to `endNode`
 * (exclusive), into another container (could be the same container), before
 * `beforeNode`. If `beforeNode` is null, it appends the nodes to the
 * container.
 */
const reparentNodes = (container, start, end = null, before = null) => {
    let node = start;
    while (node !== end) {
        const n = node.nextSibling;
        container.insertBefore(node, before);
        node = n;
    }
};
/**
 * Removes nodes, starting from `startNode` (inclusive) to `endNode`
 * (exclusive), from `container`.
 */
const removeNodes = (container, startNode, endNode = null) => {
    let node = startNode;
    while (node !== endNode) {
        const n = node.nextSibling;
        container.removeChild(node);
        node = n;
    }
};

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * A sentinel value that signals that a value was handled by a directive and
 * should not be written to the DOM.
 */
const noChange = {};
/**
 * A sentinel value that signals a NodePart to fully clear its content.
 */
const nothing = {};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An expression marker with embedded unique key to avoid collision with
 * possible text in templates.
 */
const marker = `{{lit-${String(Math.random()).slice(2)}}}`;
/**
 * An expression marker used text-positions, multi-binding attributes, and
 * attributes with markup-like text values.
 */
const nodeMarker = `<!--${marker}-->`;
const markerRegex = new RegExp(`${marker}|${nodeMarker}`);
/**
 * Suffix appended to all bound attribute names.
 */
const boundAttributeSuffix = '$lit$';
/**
 * An updateable Template that tracks the location of dynamic parts.
 */
class Template {
    constructor(result, element) {
        this.parts = [];
        this.element = element;
        let index = -1;
        let partIndex = 0;
        const nodesToRemove = [];
        const _prepareTemplate = (template) => {
            const content = template.content;
            // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be
            // null
            const walker = document.createTreeWalker(content, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
            // Keeps track of the last index associated with a part. We try to delete
            // unnecessary nodes, but we never want to associate two different parts
            // to the same index. They must have a constant node between.
            let lastPartIndex = 0;
            while (walker.nextNode()) {
                index++;
                const node = walker.currentNode;
                if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                    if (node.hasAttributes()) {
                        const attributes = node.attributes;
                        // Per
                        // https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap,
                        // attributes are not guaranteed to be returned in document order.
                        // In particular, Edge/IE can return them out of order, so we cannot
                        // assume a correspondance between part index and attribute index.
                        let count = 0;
                        for (let i = 0; i < attributes.length; i++) {
                            if (attributes[i].value.indexOf(marker) >= 0) {
                                count++;
                            }
                        }
                        while (count-- > 0) {
                            // Get the template literal section leading up to the first
                            // expression in this attribute
                            const stringForPart = result.strings[partIndex];
                            // Find the attribute name
                            const name = lastAttributeNameRegex.exec(stringForPart)[2];
                            // Find the corresponding attribute
                            // All bound attributes have had a suffix added in
                            // TemplateResult#getHTML to opt out of special attribute
                            // handling. To look up the attribute value we also need to add
                            // the suffix.
                            const attributeLookupName = name.toLowerCase() + boundAttributeSuffix;
                            const attributeValue = node.getAttribute(attributeLookupName);
                            const strings = attributeValue.split(markerRegex);
                            this.parts.push({ type: 'attribute', index, name, strings });
                            node.removeAttribute(attributeLookupName);
                            partIndex += strings.length - 1;
                        }
                    }
                    if (node.tagName === 'TEMPLATE') {
                        _prepareTemplate(node);
                    }
                }
                else if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                    const data = node.data;
                    if (data.indexOf(marker) >= 0) {
                        const parent = node.parentNode;
                        const strings = data.split(markerRegex);
                        const lastIndex = strings.length - 1;
                        // Generate a new text node for each literal section
                        // These nodes are also used as the markers for node parts
                        for (let i = 0; i < lastIndex; i++) {
                            parent.insertBefore((strings[i] === '') ? createMarker() :
                                document.createTextNode(strings[i]), node);
                            this.parts.push({ type: 'node', index: ++index });
                        }
                        // If there's no text, we must insert a comment to mark our place.
                        // Else, we can trust it will stick around after cloning.
                        if (strings[lastIndex] === '') {
                            parent.insertBefore(createMarker(), node);
                            nodesToRemove.push(node);
                        }
                        else {
                            node.data = strings[lastIndex];
                        }
                        // We have a part for each match found
                        partIndex += lastIndex;
                    }
                }
                else if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
                    if (node.data === marker) {
                        const parent = node.parentNode;
                        // Add a new marker node to be the startNode of the Part if any of
                        // the following are true:
                        //  * We don't have a previousSibling
                        //  * The previousSibling is already the start of a previous part
                        if (node.previousSibling === null || index === lastPartIndex) {
                            index++;
                            parent.insertBefore(createMarker(), node);
                        }
                        lastPartIndex = index;
                        this.parts.push({ type: 'node', index });
                        // If we don't have a nextSibling, keep this node so we have an end.
                        // Else, we can remove it to save future costs.
                        if (node.nextSibling === null) {
                            node.data = '';
                        }
                        else {
                            nodesToRemove.push(node);
                            index--;
                        }
                        partIndex++;
                    }
                    else {
                        let i = -1;
                        while ((i = node.data.indexOf(marker, i + 1)) !==
                            -1) {
                            // Comment node has a binding marker inside, make an inactive part
                            // The binding won't work, but subsequent bindings will
                            // TODO (justinfagnani): consider whether it's even worth it to
                            // make bindings in comments work
                            this.parts.push({ type: 'node', index: -1 });
                        }
                    }
                }
            }
        };
        _prepareTemplate(element);
        // Remove text binding nodes after the walk to not disturb the TreeWalker
        for (const n of nodesToRemove) {
            n.parentNode.removeChild(n);
        }
    }
}
const isTemplatePartActive = (part) => part.index !== -1;
// Allows `document.createComment('')` to be renamed for a
// small manual size-savings.
const createMarker = () => document.createComment('');
/**
 * This regex extracts the attribute name preceding an attribute-position
 * expression. It does this by matching the syntax allowed for attributes
 * against the string literal directly preceding the expression, assuming that
 * the expression is in an attribute-value position.
 *
 * See attributes in the HTML spec:
 * https://www.w3.org/TR/html5/syntax.html#attributes-0
 *
 * "\0-\x1F\x7F-\x9F" are Unicode control characters
 *
 * " \x09\x0a\x0c\x0d" are HTML space characters:
 * https://www.w3.org/TR/html5/infrastructure.html#space-character
 *
 * So an attribute is:
 *  * The name: any character except a control character, space character, ('),
 *    ("), ">", "=", or "/"
 *  * Followed by zero or more space characters
 *  * Followed by "="
 *  * Followed by zero or more space characters
 *  * Followed by:
 *    * Any character except space, ('), ("), "<", ">", "=", (`), or
 *    * (") then any non-("), or
 *    * (') then any non-(')
 */
const lastAttributeNameRegex = /([ \x09\x0a\x0c\x0d])([^\0-\x1F\x7F-\x9F \x09\x0a\x0c\x0d"'>=/]+)([ \x09\x0a\x0c\x0d]*=[ \x09\x0a\x0c\x0d]*(?:[^ \x09\x0a\x0c\x0d"'`<>=]*|"[^"]*|'[^']*))$/;

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * An instance of a `Template` that can be attached to the DOM and updated
 * with new values.
 */
class TemplateInstance {
    constructor(template, processor, options) {
        this._parts = [];
        this.template = template;
        this.processor = processor;
        this.options = options;
    }
    update(values) {
        let i = 0;
        for (const part of this._parts) {
            if (part !== undefined) {
                part.setValue(values[i]);
            }
            i++;
        }
        for (const part of this._parts) {
            if (part !== undefined) {
                part.commit();
            }
        }
    }
    _clone() {
        // When using the Custom Elements polyfill, clone the node, rather than
        // importing it, to keep the fragment in the template's document. This
        // leaves the fragment inert so custom elements won't upgrade and
        // potentially modify their contents by creating a polyfilled ShadowRoot
        // while we traverse the tree.
        const fragment = isCEPolyfill ?
            this.template.element.content.cloneNode(true) :
            document.importNode(this.template.element.content, true);
        const parts = this.template.parts;
        let partIndex = 0;
        let nodeIndex = 0;
        const _prepareInstance = (fragment) => {
            // Edge needs all 4 parameters present; IE11 needs 3rd parameter to be
            // null
            const walker = document.createTreeWalker(fragment, 133 /* NodeFilter.SHOW_{ELEMENT|COMMENT|TEXT} */, null, false);
            let node = walker.nextNode();
            // Loop through all the nodes and parts of a template
            while (partIndex < parts.length && node !== null) {
                const part = parts[partIndex];
                // Consecutive Parts may have the same node index, in the case of
                // multiple bound attributes on an element. So each iteration we either
                // increment the nodeIndex, if we aren't on a node with a part, or the
                // partIndex if we are. By not incrementing the nodeIndex when we find a
                // part, we allow for the next part to be associated with the current
                // node if neccessasry.
                if (!isTemplatePartActive(part)) {
                    this._parts.push(undefined);
                    partIndex++;
                }
                else if (nodeIndex === part.index) {
                    if (part.type === 'node') {
                        const part = this.processor.handleTextExpression(this.options);
                        part.insertAfterNode(node.previousSibling);
                        this._parts.push(part);
                    }
                    else {
                        this._parts.push(...this.processor.handleAttributeExpressions(node, part.name, part.strings, this.options));
                    }
                    partIndex++;
                }
                else {
                    nodeIndex++;
                    if (node.nodeName === 'TEMPLATE') {
                        _prepareInstance(node.content);
                    }
                    node = walker.nextNode();
                }
            }
        };
        _prepareInstance(fragment);
        if (isCEPolyfill) {
            document.adoptNode(fragment);
            customElements.upgrade(fragment);
        }
        return fragment;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * The return type of `html`, which holds a Template and the values from
 * interpolated expressions.
 */
class TemplateResult {
    constructor(strings, values, type, processor) {
        this.strings = strings;
        this.values = values;
        this.type = type;
        this.processor = processor;
    }
    /**
     * Returns a string of HTML used to create a `<template>` element.
     */
    getHTML() {
        const endIndex = this.strings.length - 1;
        let html = '';
        for (let i = 0; i < endIndex; i++) {
            const s = this.strings[i];
            // This exec() call does two things:
            // 1) Appends a suffix to the bound attribute name to opt out of special
            // attribute value parsing that IE11 and Edge do, like for style and
            // many SVG attributes. The Template class also appends the same suffix
            // when looking up attributes to create Parts.
            // 2) Adds an unquoted-attribute-safe marker for the first expression in
            // an attribute. Subsequent attribute expressions will use node markers,
            // and this is safe since attributes with multiple expressions are
            // guaranteed to be quoted.
            const match = lastAttributeNameRegex.exec(s);
            if (match) {
                // We're starting a new bound attribute.
                // Add the safe attribute suffix, and use unquoted-attribute-safe
                // marker.
                html += s.substr(0, match.index) + match[1] + match[2] +
                    boundAttributeSuffix + match[3] + marker;
            }
            else {
                // We're either in a bound node, or trailing bound attribute.
                // Either way, nodeMarker is safe to use.
                html += s + nodeMarker;
            }
        }
        return html + this.strings[endIndex];
    }
    getTemplateElement() {
        const template = document.createElement('template');
        template.innerHTML = this.getHTML();
        return template;
    }
}

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const isPrimitive = (value) => {
    return (value === null ||
        !(typeof value === 'object' || typeof value === 'function'));
};
/**
 * Sets attribute values for AttributeParts, so that the value is only set once
 * even if there are multiple parts for an attribute.
 */
class AttributeCommitter {
    constructor(element, name, strings) {
        this.dirty = true;
        this.element = element;
        this.name = name;
        this.strings = strings;
        this.parts = [];
        for (let i = 0; i < strings.length - 1; i++) {
            this.parts[i] = this._createPart();
        }
    }
    /**
     * Creates a single part. Override this to create a differnt type of part.
     */
    _createPart() {
        return new AttributePart(this);
    }
    _getValue() {
        const strings = this.strings;
        const l = strings.length - 1;
        let text = '';
        for (let i = 0; i < l; i++) {
            text += strings[i];
            const part = this.parts[i];
            if (part !== undefined) {
                const v = part.value;
                if (v != null &&
                    (Array.isArray(v) ||
                        // tslint:disable-next-line:no-any
                        typeof v !== 'string' && v[Symbol.iterator])) {
                    for (const t of v) {
                        text += typeof t === 'string' ? t : String(t);
                    }
                }
                else {
                    text += typeof v === 'string' ? v : String(v);
                }
            }
        }
        text += strings[l];
        return text;
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            this.element.setAttribute(this.name, this._getValue());
        }
    }
}
class AttributePart {
    constructor(comitter) {
        this.value = undefined;
        this.committer = comitter;
    }
    setValue(value) {
        if (value !== noChange && (!isPrimitive(value) || value !== this.value)) {
            this.value = value;
            // If the value is a not a directive, dirty the committer so that it'll
            // call setAttribute. If the value is a directive, it'll dirty the
            // committer if it calls setValue().
            if (!isDirective(value)) {
                this.committer.dirty = true;
            }
        }
    }
    commit() {
        while (isDirective(this.value)) {
            const directive = this.value;
            this.value = noChange;
            directive(this);
        }
        if (this.value === noChange) {
            return;
        }
        this.committer.commit();
    }
}
class NodePart {
    constructor(options) {
        this.value = undefined;
        this._pendingValue = undefined;
        this.options = options;
    }
    /**
     * Inserts this part into a container.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendInto(container) {
        this.startNode = container.appendChild(createMarker());
        this.endNode = container.appendChild(createMarker());
    }
    /**
     * Inserts this part between `ref` and `ref`'s next sibling. Both `ref` and
     * its next sibling must be static, unchanging nodes such as those that appear
     * in a literal section of a template.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterNode(ref) {
        this.startNode = ref;
        this.endNode = ref.nextSibling;
    }
    /**
     * Appends this part into a parent part.
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    appendIntoPart(part) {
        part._insert(this.startNode = createMarker());
        part._insert(this.endNode = createMarker());
    }
    /**
     * Appends this part after `ref`
     *
     * This part must be empty, as its contents are not automatically moved.
     */
    insertAfterPart(ref) {
        ref._insert(this.startNode = createMarker());
        this.endNode = ref.endNode;
        ref.endNode = this.startNode;
    }
    setValue(value) {
        this._pendingValue = value;
    }
    commit() {
        while (isDirective(this._pendingValue)) {
            const directive = this._pendingValue;
            this._pendingValue = noChange;
            directive(this);
        }
        const value = this._pendingValue;
        if (value === noChange) {
            return;
        }
        if (isPrimitive(value)) {
            if (value !== this.value) {
                this._commitText(value);
            }
        }
        else if (value instanceof TemplateResult) {
            this._commitTemplateResult(value);
        }
        else if (value instanceof Node) {
            this._commitNode(value);
        }
        else if (Array.isArray(value) ||
            // tslint:disable-next-line:no-any
            value[Symbol.iterator]) {
            this._commitIterable(value);
        }
        else if (value === nothing) {
            this.value = nothing;
            this.clear();
        }
        else {
            // Fallback, will render the string representation
            this._commitText(value);
        }
    }
    _insert(node) {
        this.endNode.parentNode.insertBefore(node, this.endNode);
    }
    _commitNode(value) {
        if (this.value === value) {
            return;
        }
        this.clear();
        this._insert(value);
        this.value = value;
    }
    _commitText(value) {
        const node = this.startNode.nextSibling;
        value = value == null ? '' : value;
        if (node === this.endNode.previousSibling &&
            node.nodeType === 3 /* Node.TEXT_NODE */) {
            // If we only have a single text node between the markers, we can just
            // set its value, rather than replacing it.
            // TODO(justinfagnani): Can we just check if this.value is primitive?
            node.data = value;
        }
        else {
            this._commitNode(document.createTextNode(typeof value === 'string' ? value : String(value)));
        }
        this.value = value;
    }
    _commitTemplateResult(value) {
        const template = this.options.templateFactory(value);
        if (this.value instanceof TemplateInstance &&
            this.value.template === template) {
            this.value.update(value.values);
        }
        else {
            // Make sure we propagate the template processor from the TemplateResult
            // so that we use its syntax extension, etc. The template factory comes
            // from the render function options so that it can control template
            // caching and preprocessing.
            const instance = new TemplateInstance(template, value.processor, this.options);
            const fragment = instance._clone();
            instance.update(value.values);
            this._commitNode(fragment);
            this.value = instance;
        }
    }
    _commitIterable(value) {
        // For an Iterable, we create a new InstancePart per item, then set its
        // value to the item. This is a little bit of overhead for every item in
        // an Iterable, but it lets us recurse easily and efficiently update Arrays
        // of TemplateResults that will be commonly returned from expressions like:
        // array.map((i) => html`${i}`), by reusing existing TemplateInstances.
        // If _value is an array, then the previous render was of an
        // iterable and _value will contain the NodeParts from the previous
        // render. If _value is not an array, clear this part and make a new
        // array for NodeParts.
        if (!Array.isArray(this.value)) {
            this.value = [];
            this.clear();
        }
        // Lets us keep track of how many items we stamped so we can clear leftover
        // items from a previous render
        const itemParts = this.value;
        let partIndex = 0;
        let itemPart;
        for (const item of value) {
            // Try to reuse an existing part
            itemPart = itemParts[partIndex];
            // If no existing part, create a new one
            if (itemPart === undefined) {
                itemPart = new NodePart(this.options);
                itemParts.push(itemPart);
                if (partIndex === 0) {
                    itemPart.appendIntoPart(this);
                }
                else {
                    itemPart.insertAfterPart(itemParts[partIndex - 1]);
                }
            }
            itemPart.setValue(item);
            itemPart.commit();
            partIndex++;
        }
        if (partIndex < itemParts.length) {
            // Truncate the parts array so _value reflects the current state
            itemParts.length = partIndex;
            this.clear(itemPart && itemPart.endNode);
        }
    }
    clear(startNode = this.startNode) {
        removeNodes(this.startNode.parentNode, startNode.nextSibling, this.endNode);
    }
}
/**
 * Implements a boolean attribute, roughly as defined in the HTML
 * specification.
 *
 * If the value is truthy, then the attribute is present with a value of
 * ''. If the value is falsey, the attribute is removed.
 */
class BooleanAttributePart {
    constructor(element, name, strings) {
        this.value = undefined;
        this._pendingValue = undefined;
        if (strings.length !== 2 || strings[0] !== '' || strings[1] !== '') {
            throw new Error('Boolean attributes can only contain a single expression');
        }
        this.element = element;
        this.name = name;
        this.strings = strings;
    }
    setValue(value) {
        this._pendingValue = value;
    }
    commit() {
        while (isDirective(this._pendingValue)) {
            const directive = this._pendingValue;
            this._pendingValue = noChange;
            directive(this);
        }
        if (this._pendingValue === noChange) {
            return;
        }
        const value = !!this._pendingValue;
        if (this.value !== value) {
            if (value) {
                this.element.setAttribute(this.name, '');
            }
            else {
                this.element.removeAttribute(this.name);
            }
        }
        this.value = value;
        this._pendingValue = noChange;
    }
}
/**
 * Sets attribute values for PropertyParts, so that the value is only set once
 * even if there are multiple parts for a property.
 *
 * If an expression controls the whole property value, then the value is simply
 * assigned to the property under control. If there are string literals or
 * multiple expressions, then the strings are expressions are interpolated into
 * a string first.
 */
class PropertyCommitter extends AttributeCommitter {
    constructor(element, name, strings) {
        super(element, name, strings);
        this.single =
            (strings.length === 2 && strings[0] === '' && strings[1] === '');
    }
    _createPart() {
        return new PropertyPart(this);
    }
    _getValue() {
        if (this.single) {
            return this.parts[0].value;
        }
        return super._getValue();
    }
    commit() {
        if (this.dirty) {
            this.dirty = false;
            // tslint:disable-next-line:no-any
            this.element[this.name] = this._getValue();
        }
    }
}
class PropertyPart extends AttributePart {
}
// Detect event listener options support. If the `capture` property is read
// from the options object, then options are supported. If not, then the thrid
// argument to add/removeEventListener is interpreted as the boolean capture
// value so we should only pass the `capture` property.
let eventOptionsSupported = false;
try {
    const options = {
        get capture() {
            eventOptionsSupported = true;
            return false;
        }
    };
    // tslint:disable-next-line:no-any
    window.addEventListener('test', options, options);
    // tslint:disable-next-line:no-any
    window.removeEventListener('test', options, options);
}
catch (_e) {
}
class EventPart {
    constructor(element, eventName, eventContext) {
        this.value = undefined;
        this._pendingValue = undefined;
        this.element = element;
        this.eventName = eventName;
        this.eventContext = eventContext;
        this._boundHandleEvent = (e) => this.handleEvent(e);
    }
    setValue(value) {
        this._pendingValue = value;
    }
    commit() {
        while (isDirective(this._pendingValue)) {
            const directive = this._pendingValue;
            this._pendingValue = noChange;
            directive(this);
        }
        if (this._pendingValue === noChange) {
            return;
        }
        const newListener = this._pendingValue;
        const oldListener = this.value;
        const shouldRemoveListener = newListener == null ||
            oldListener != null &&
                (newListener.capture !== oldListener.capture ||
                    newListener.once !== oldListener.once ||
                    newListener.passive !== oldListener.passive);
        const shouldAddListener = newListener != null && (oldListener == null || shouldRemoveListener);
        if (shouldRemoveListener) {
            this.element.removeEventListener(this.eventName, this._boundHandleEvent, this._options);
        }
        if (shouldAddListener) {
            this._options = getOptions(newListener);
            this.element.addEventListener(this.eventName, this._boundHandleEvent, this._options);
        }
        this.value = newListener;
        this._pendingValue = noChange;
    }
    handleEvent(event) {
        if (typeof this.value === 'function') {
            this.value.call(this.eventContext || this.element, event);
        }
        else {
            this.value.handleEvent(event);
        }
    }
}
// We copy options because of the inconsistent behavior of browsers when reading
// the third argument of add/removeEventListener. IE11 doesn't support options
// at all. Chrome 41 only reads `capture` if the argument is an object.
const getOptions = (o) => o &&
    (eventOptionsSupported ?
        { capture: o.capture, passive: o.passive, once: o.once } :
        o.capture);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Creates Parts when a template is instantiated.
 */
class DefaultTemplateProcessor {
    /**
     * Create parts for an attribute-position binding, given the event, attribute
     * name, and string literals.
     *
     * @param element The element containing the binding
     * @param name  The attribute name
     * @param strings The string literals. There are always at least two strings,
     *   event for fully-controlled bindings with a single expression.
     */
    handleAttributeExpressions(element, name, strings, options) {
        const prefix = name[0];
        if (prefix === '.') {
            const comitter = new PropertyCommitter(element, name.slice(1), strings);
            return comitter.parts;
        }
        if (prefix === '@') {
            return [new EventPart(element, name.slice(1), options.eventContext)];
        }
        if (prefix === '?') {
            return [new BooleanAttributePart(element, name.slice(1), strings)];
        }
        const comitter = new AttributeCommitter(element, name, strings);
        return comitter.parts;
    }
    /**
     * Create parts for a text-position binding.
     * @param templateFactory
     */
    handleTextExpression(options) {
        return new NodePart(options);
    }
}
const defaultTemplateProcessor = new DefaultTemplateProcessor();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * The default TemplateFactory which caches Templates keyed on
 * result.type and result.strings.
 */
function templateFactory(result) {
    let templateCache = templateCaches.get(result.type);
    if (templateCache === undefined) {
        templateCache = {
            stringsArray: new WeakMap(),
            keyString: new Map()
        };
        templateCaches.set(result.type, templateCache);
    }
    let template = templateCache.stringsArray.get(result.strings);
    if (template !== undefined) {
        return template;
    }
    // If the TemplateStringsArray is new, generate a key from the strings
    // This key is shared between all templates with identical content
    const key = result.strings.join(marker);
    // Check if we already have a Template for this key
    template = templateCache.keyString.get(key);
    if (template === undefined) {
        // If we have not seen this key before, create a new Template
        template = new Template(result, result.getTemplateElement());
        // Cache the Template for this key
        templateCache.keyString.set(key, template);
    }
    // Cache all future queries for this TemplateStringsArray
    templateCache.stringsArray.set(result.strings, template);
    return template;
}
const templateCaches = new Map();

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const parts = new WeakMap();
/**
 * Renders a template to a container.
 *
 * To update a container with new values, reevaluate the template literal and
 * call `render` with the new result.
 *
 * @param result a TemplateResult created by evaluating a template tag like
 *     `html` or `svg`.
 * @param container A DOM parent to render to. The entire contents are either
 *     replaced, or efficiently updated if the same result type was previous
 *     rendered there.
 * @param options RenderOptions for the entire render tree rendered to this
 *     container. Render options must *not* change between renders to the same
 *     container, as those changes will not effect previously rendered DOM.
 */
const render = (result, container, options) => {
    let part = parts.get(container);
    if (part === undefined) {
        removeNodes(container, container.firstChild);
        parts.set(container, part = new NodePart(Object.assign({ templateFactory }, options)));
        part.appendInto(container);
    }
    part.setValue(result);
    part.commit();
};

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// IMPORTANT: do not change the property name or the assignment expression.
// This line will be used in regexes to search for lit-html usage.
// TODO(justinfagnani): inject version number at build time
(window['litHtmlVersions'] || (window['litHtmlVersions'] = [])).push('1.0.0');
/**
 * Interprets a template literal as an HTML template that can efficiently
 * render to and update a container.
 */
const html = (strings, ...values) => new TemplateResult(strings, values, 'html', defaultTemplateProcessor);

/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// Helper functions for manipulating parts
// TODO(kschaaf): Refactor into Part API?
const createAndInsertPart = (containerPart, beforePart) => {
    const container = containerPart.startNode.parentNode;
    const beforeNode = beforePart === undefined ? containerPart.endNode :
        beforePart.startNode;
    const startNode = container.insertBefore(createMarker(), beforeNode);
    container.insertBefore(createMarker(), beforeNode);
    const newPart = new NodePart(containerPart.options);
    newPart.insertAfterNode(startNode);
    return newPart;
};
const updatePart = (part, value) => {
    part.setValue(value);
    part.commit();
    return part;
};
const insertPartBefore = (containerPart, part, ref) => {
    const container = containerPart.startNode.parentNode;
    const beforeNode = ref ? ref.startNode : containerPart.endNode;
    const endNode = part.endNode.nextSibling;
    if (endNode !== beforeNode) {
        reparentNodes(container, part.startNode, endNode, beforeNode);
    }
};
const removePart = (part) => {
    removeNodes(part.startNode.parentNode, part.startNode, part.endNode.nextSibling);
};
// Helper for generating a map of array item to its index over a subset
// of an array (used to lazily generate `newKeyToIndexMap` and
// `oldKeyToIndexMap`)
const generateMap = (list, start, end) => {
    const map = new Map();
    for (let i = start; i <= end; i++) {
        map.set(list[i], i);
    }
    return map;
};
// Stores previous ordered list of parts and map of key to index
const partListCache = new WeakMap();
const keyListCache = new WeakMap();
/**
 * A directive that repeats a series of values (usually `TemplateResults`)
 * generated from an iterable, and updates those items efficiently when the
 * iterable changes based on user-provided `keys` associated with each item.
 *
 * Note that if a `keyFn` is provided, strict key-to-DOM mapping is maintained,
 * meaning previous DOM for a given key is moved into the new position if
 * needed, and DOM will never be reused with values for different keys (new DOM
 * will always be created for new keys). This is generally the most efficient
 * way to use `repeat` since it performs minimum unnecessary work for insertions
 * amd removals.
 *
 * IMPORTANT: If providing a `keyFn`, keys *must* be unique for all items in a
 * given call to `repeat`. The behavior when two or more items have the same key
 * is undefined.
 *
 * If no `keyFn` is provided, this directive will perform similar to mapping
 * items to values, and DOM will be reused against potentially different items.
 */
const repeat = directive((items, keyFnOrTemplate, template) => {
    let keyFn;
    if (template === undefined) {
        template = keyFnOrTemplate;
    }
    else if (keyFnOrTemplate !== undefined) {
        keyFn = keyFnOrTemplate;
    }
    return (containerPart) => {
        if (!(containerPart instanceof NodePart)) {
            throw new Error('repeat can only be used in text bindings');
        }
        // Old part & key lists are retrieved from the last update
        // (associated with the part for this instance of the directive)
        const oldParts = partListCache.get(containerPart) || [];
        const oldKeys = keyListCache.get(containerPart) || [];
        // New part list will be built up as we go (either reused from
        // old parts or created for new keys in this update). This is
        // saved in the above cache at the end of the update.
        const newParts = [];
        // New value list is eagerly generated from items along with a
        // parallel array indicating its key.
        const newValues = [];
        const newKeys = [];
        let index = 0;
        for (const item of items) {
            newKeys[index] = keyFn ? keyFn(item, index) : index;
            newValues[index] = template(item, index);
            index++;
        }
        // Maps from key to index for current and previous update; these
        // are generated lazily only when needed as a performance
        // optimization, since they are only required for multiple
        // non-contiguous changes in the list, which are less common.
        let newKeyToIndexMap;
        let oldKeyToIndexMap;
        // Head and tail pointers to old parts and new values
        let oldHead = 0;
        let oldTail = oldParts.length - 1;
        let newHead = 0;
        let newTail = newValues.length - 1;
        // Overview of O(n) reconciliation algorithm (general approach
        // based on ideas found in ivi, vue, snabbdom, etc.):
        //
        // * We start with the list of old parts and new values (and
        // arrays of
        //   their respective keys), head/tail pointers into each, and
        //   we build up the new list of parts by updating (and when
        //   needed, moving) old parts or creating new ones. The initial
        //   scenario might look like this (for brevity of the diagrams,
        //   the numbers in the array reflect keys associated with the
        //   old parts or new values, although keys and parts/values are
        //   actually stored in parallel arrays indexed using the same
        //   head/tail pointers):
        //
        //      oldHead v                 v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [ ,  ,  ,  ,  ,  ,  ]
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6] <- reflects the user's new
        //   item order
        //      newHead ^                 ^ newTail
        //
        // * Iterate old & new lists from both sides, updating,
        // swapping, or
        //   removing parts at the head/tail locations until neither
        //   head nor tail can move.
        //
        // * Example below: keys at head pointers match, so update old
        // part 0 in-
        //   place (no need to move it) and record part 0 in the
        //   `newParts` list. The last thing we do is advance the
        //   `oldHead` and `newHead` pointers (will be reflected in the
        //   next diagram).
        //
        //      oldHead v                 v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [0,  ,  ,  ,  ,  ,  ] <- heads matched: update 0
        //   and newKeys:  [0, 2, 1, 4, 3, 7, 6]    advance both oldHead
        //   & newHead
        //      newHead ^                 ^ newTail
        //
        // * Example below: head pointers don't match, but tail pointers
        // do, so
        //   update part 6 in place (no need to move it), and record
        //   part 6 in the `newParts` list. Last, advance the `oldTail`
        //   and `oldHead` pointers.
        //
        //         oldHead v              v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [0,  ,  ,  ,  ,  , 6] <- tails matched: update 6
        //   and newKeys:  [0, 2, 1, 4, 3, 7, 6]    advance both oldTail
        //   & newTail
        //         newHead ^              ^ newTail
        //
        // * If neither head nor tail match; next check if one of the
        // old head/tail
        //   items was removed. We first need to generate the reverse
        //   map of new keys to index (`newKeyToIndexMap`), which is
        //   done once lazily as a performance optimization, since we
        //   only hit this case if multiple non-contiguous changes were
        //   made. Note that for contiguous removal anywhere in the
        //   list, the head and tails would advance from either end and
        //   pass each other before we get to this case and removals
        //   would be handled in the final while loop without needing to
        //   generate the map.
        //
        // * Example below: The key at `oldTail` was removed (no longer
        // in the
        //   `newKeyToIndexMap`), so remove that part from the DOM and
        //   advance just the `oldTail` pointer.
        //
        //         oldHead v           v oldTail
        //   oldKeys:  [0, 1, 2, 3, 4, 5, 6]
        //   newParts: [0,  ,  ,  ,  ,  , 6] <- 5 not in new map; remove
        //   5 and newKeys:  [0, 2, 1, 4, 3, 7, 6]    advance oldTail
        //         newHead ^           ^ newTail
        //
        // * Once head and tail cannot move, any mismatches are due to
        // either new or
        //   moved items; if a new key is in the previous "old key to
        //   old index" map, move the old part to the new location,
        //   otherwise create and insert a new part. Note that when
        //   moving an old part we null its position in the oldParts
        //   array if it lies between the head and tail so we know to
        //   skip it when the pointers get there.
        //
        // * Example below: neither head nor tail match, and neither
        // were removed;
        //   so find the `newHead` key in the `oldKeyToIndexMap`, and
        //   move that old part's DOM into the next head position
        //   (before `oldParts[oldHead]`). Last, null the part in the
        //   `oldPart` array since it was somewhere in the remaining
        //   oldParts still to be scanned (between the head and tail
        //   pointers) so that we know to skip that old part on future
        //   iterations.
        //
        //         oldHead v        v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2,  ,  ,  ,  , 6] <- stuck; update & move 2
        //   into place newKeys:  [0, 2, 1, 4, 3, 7, 6]    and advance
        //   newHead
        //         newHead ^           ^ newTail
        //
        // * Note that for moves/insertions like the one above, a part
        // inserted at
        //   the head pointer is inserted before the current
        //   `oldParts[oldHead]`, and a part inserted at the tail
        //   pointer is inserted before `newParts[newTail+1]`. The
        //   seeming asymmetry lies in the fact that new parts are moved
        //   into place outside in, so to the right of the head pointer
        //   are old parts, and to the right of the tail pointer are new
        //   parts.
        //
        // * We always restart back from the top of the algorithm,
        // allowing matching
        //   and simple updates in place to continue...
        //
        // * Example below: the head pointers once again match, so
        // simply update
        //   part 1 and record it in the `newParts` array.  Last,
        //   advance both head pointers.
        //
        //         oldHead v        v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1,  ,  ,  , 6] <- heads matched; update 1
        //   and newKeys:  [0, 2, 1, 4, 3, 7, 6]    advance both oldHead
        //   & newHead
        //            newHead ^        ^ newTail
        //
        // * As mentioned above, items that were moved as a result of
        // being stuck
        //   (the final else clause in the code below) are marked with
        //   null, so we always advance old pointers over these so we're
        //   comparing the next actual old value on either end.
        //
        // * Example below: `oldHead` is null (already placed in
        // newParts), so
        //   advance `oldHead`.
        //
        //            oldHead v     v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6] // old head already used;
        //   advance newParts: [0, 2, 1,  ,  ,  , 6] // oldHead newKeys:
        //   [0, 2, 1, 4, 3, 7, 6]
        //               newHead ^     ^ newTail
        //
        // * Note it's not critical to mark old parts as null when they
        // are moved
        //   from head to tail or tail to head, since they will be
        //   outside the pointer range and never visited again.
        //
        // * Example below: Here the old tail key matches the new head
        // key, so
        //   the part at the `oldTail` position and move its DOM to the
        //   new head position (before `oldParts[oldHead]`). Last,
        //   advance `oldTail` and `newHead` pointers.
        //
        //               oldHead v  v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1, 4,  ,  , 6] <- old tail matches new
        //   head: update newKeys:  [0, 2, 1, 4, 3, 7, 6]   & move 4,
        //   advance oldTail & newHead
        //               newHead ^     ^ newTail
        //
        // * Example below: Old and new head keys match, so update the
        // old head
        //   part in place, and advance the `oldHead` and `newHead`
        //   pointers.
        //
        //               oldHead v oldTail
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1, 4, 3,   ,6] <- heads match: update 3
        //   and advance newKeys:  [0, 2, 1, 4, 3, 7, 6]    oldHead &
        //   newHead
        //                  newHead ^  ^ newTail
        //
        // * Once the new or old pointers move past each other then all
        // we have
        //   left is additions (if old list exhausted) or removals (if
        //   new list exhausted). Those are handled in the final while
        //   loops at the end.
        //
        // * Example below: `oldHead` exceeded `oldTail`, so we're done
        // with the
        //   main loop.  Create the remaining part and insert it at the
        //   new head position, and the update is complete.
        //
        //                   (oldHead > oldTail)
        //   oldKeys:  [0, 1, -, 3, 4, 5, 6]
        //   newParts: [0, 2, 1, 4, 3, 7 ,6] <- create and insert 7
        //   newKeys:  [0, 2, 1, 4, 3, 7, 6]
        //                     newHead ^ newTail
        //
        // * Note that the order of the if/else clauses is not important
        // to the
        //   algorithm, as long as the null checks come first (to ensure
        //   we're always working on valid old parts) and that the final
        //   else clause comes last (since that's where the expensive
        //   moves occur). The order of remaining clauses is is just a
        //   simple guess at which cases will be most common.
        //
        // * TODO(kschaaf) Note, we could calculate the longest
        // increasing
        //   subsequence (LIS) of old items in new position, and only
        //   move those not in the LIS set. However that costs O(nlogn)
        //   time and adds a bit more code, and only helps make rare
        //   types of mutations require fewer moves. The above handles
        //   removes, adds, reversal, swaps, and single moves of
        //   contiguous items in linear time, in the minimum number of
        //   moves. As the number of multiple moves where LIS might help
        //   approaches a random shuffle, the LIS optimization becomes
        //   less helpful, so it seems not worth the code at this point.
        //   Could reconsider if a compelling case arises.
        while (oldHead <= oldTail && newHead <= newTail) {
            if (oldParts[oldHead] === null) {
                // `null` means old part at head has already been used
                // below; skip
                oldHead++;
            }
            else if (oldParts[oldTail] === null) {
                // `null` means old part at tail has already been used
                // below; skip
                oldTail--;
            }
            else if (oldKeys[oldHead] === newKeys[newHead]) {
                // Old head matches new head; update in place
                newParts[newHead] =
                    updatePart(oldParts[oldHead], newValues[newHead]);
                oldHead++;
                newHead++;
            }
            else if (oldKeys[oldTail] === newKeys[newTail]) {
                // Old tail matches new tail; update in place
                newParts[newTail] =
                    updatePart(oldParts[oldTail], newValues[newTail]);
                oldTail--;
                newTail--;
            }
            else if (oldKeys[oldHead] === newKeys[newTail]) {
                // Old head matches new tail; update and move to new tail
                newParts[newTail] =
                    updatePart(oldParts[oldHead], newValues[newTail]);
                insertPartBefore(containerPart, oldParts[oldHead], newParts[newTail + 1]);
                oldHead++;
                newTail--;
            }
            else if (oldKeys[oldTail] === newKeys[newHead]) {
                // Old tail matches new head; update and move to new head
                newParts[newHead] =
                    updatePart(oldParts[oldTail], newValues[newHead]);
                insertPartBefore(containerPart, oldParts[oldTail], oldParts[oldHead]);
                oldTail--;
                newHead++;
            }
            else {
                if (newKeyToIndexMap === undefined) {
                    // Lazily generate key-to-index maps, used for removals &
                    // moves below
                    newKeyToIndexMap = generateMap(newKeys, newHead, newTail);
                    oldKeyToIndexMap = generateMap(oldKeys, oldHead, oldTail);
                }
                if (!newKeyToIndexMap.has(oldKeys[oldHead])) {
                    // Old head is no longer in new list; remove
                    removePart(oldParts[oldHead]);
                    oldHead++;
                }
                else if (!newKeyToIndexMap.has(oldKeys[oldTail])) {
                    // Old tail is no longer in new list; remove
                    removePart(oldParts[oldTail]);
                    oldTail--;
                }
                else {
                    // Any mismatches at this point are due to additions or
                    // moves; see if we have an old part we can reuse and move
                    // into place
                    const oldIndex = oldKeyToIndexMap.get(newKeys[newHead]);
                    const oldPart = oldIndex !== undefined ? oldParts[oldIndex] : null;
                    if (oldPart === null) {
                        // No old part for this value; create a new one and
                        // insert it
                        const newPart = createAndInsertPart(containerPart, oldParts[oldHead]);
                        updatePart(newPart, newValues[newHead]);
                        newParts[newHead] = newPart;
                    }
                    else {
                        // Reuse old part
                        newParts[newHead] =
                            updatePart(oldPart, newValues[newHead]);
                        insertPartBefore(containerPart, oldPart, oldParts[oldHead]);
                        // This marks the old part as having been used, so that
                        // it will be skipped in the first two checks above
                        oldParts[oldIndex] = null;
                    }
                    newHead++;
                }
            }
        }
        // Add parts for any remaining new values
        while (newHead <= newTail) {
            // For all remaining additions, we insert before last new
            // tail, since old pointers are no longer valid
            const newPart = createAndInsertPart(containerPart, newParts[newTail + 1]);
            updatePart(newPart, newValues[newHead]);
            newParts[newHead++] = newPart;
        }
        // Remove any remaining unused old parts
        while (oldHead <= oldTail) {
            const oldPart = oldParts[oldHead++];
            if (oldPart !== null) {
                removePart(oldPart);
            }
        }
        // Save order of new parts for next round
        partListCache.set(containerPart, newParts);
        keyListCache.set(containerPart, newKeys);
    };
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
// On IE11, classList.toggle doesn't accept a second argument.
// Since this is so minor, we just polyfill it.
if (window.navigator.userAgent.match('Trident')) {
    DOMTokenList.prototype.toggle = function (token, force) {
        if (force === undefined || force) {
            this.add(token);
        }
        else {
            this.remove(token);
        }
        return force === undefined ? true : force;
    };
}
/**
 * Stores the ClassInfo object applied to a given AttributePart.
 * Used to unset existing values when a new ClassInfo object is applied.
 */
const classMapCache = new WeakMap();
/**
 * Stores AttributeParts that have had static classes applied (e.g. `foo` in
 * class="foo ${classMap()}"). Static classes are applied only the first time
 * the directive is run on a part.
 */
// Note, could be a WeakSet, but prefer not requiring this polyfill.
const classMapStatics = new WeakMap();
/**
 * A directive that applies CSS classes. This must be used in the `class`
 * attribute and must be the only part used in the attribute. It takes each
 * property in the `classInfo` argument and adds the property name to the
 * element's `classList` if the property value is truthy; if the property value
 * is falsey, the property name is removed from the element's `classList`. For
 * example
 * `{foo: bar}` applies the class `foo` if the value of `bar` is truthy.
 * @param classInfo {ClassInfo}
 */
const classMap = directive((classInfo) => (part) => {
    if (!(part instanceof AttributePart) || (part instanceof PropertyPart) ||
        part.committer.name !== 'class' || part.committer.parts.length > 1) {
        throw new Error('The `classMap` directive must be used in the `class` attribute ' +
            'and must be the only part in the attribute.');
    }
    // handle static classes
    if (!classMapStatics.has(part)) {
        part.committer.element.className = part.committer.strings.join(' ');
        classMapStatics.set(part, true);
    }
    // remove old classes that no longer apply
    const oldInfo = classMapCache.get(part);
    for (const name in oldInfo) {
        if (!(name in classInfo)) {
            part.committer.element.classList.remove(name);
        }
    }
    // add new classes
    for (const name in classInfo) {
        if (!oldInfo || (oldInfo[name] !== classInfo[name])) {
            // We explicitly want a loose truthy check here because
            // it seems more convenient that '' and 0 are skipped.
            part.committer.element.classList.toggle(name, Boolean(classInfo[name]));
        }
    }
    classMapCache.set(part, classInfo);
});

/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
/**
 * Stores the StyleInfo object applied to a given AttributePart.
 * Used to unset existing values when a new StyleInfo object is applied.
 */
const styleMapCache = new WeakMap();
/**
 * Stores AttributeParts that have had static styles applied (e.g. `height: 0;`
 * in style="height: 0; ${styleMap()}"). Static styles are applied only the
 * first time the directive is run on a part.
 */
// Note, could be a WeakSet, but prefer not requiring this polyfill.
const styleMapStatics = new WeakMap();
/**
 * A directive that applies CSS properties to an element.
 *
 * `styleMap` can only be used in the `style` attribute and must be the only
 * expression in the attribute. It takes the property names in the `styleInfo`
 * object and adds the property values as CSS propertes. Property names with
 * dashes (`-`) are assumed to be valid CSS property names and set on the
 * element's style object using `setProperty()`. Names without dashes are
 * assumed to be camelCased JavaScript property names and set on the element's
 * style object using property assignment, allowing the style object to
 * translate JavaScript-style names to CSS property names.
 *
 * For example `styleMap({backgroundColor: 'red', 'border-top': '5px', '--size':
 * '0'})` sets the `background-color`, `border-top` and `--size` properties.
 *
 * @param styleInfo {StyleInfo}
 */
const styleMap$1 = directive((styleInfo) => (part) => {
    if (!(part instanceof AttributePart) || (part instanceof PropertyPart) ||
        part.committer.name !== 'style' || part.committer.parts.length > 1) {
        throw new Error('The `styleMap` directive must be used in the style attribute ' +
            'and must be the only part in the attribute.');
    }
    // Handle static styles the first time we see a Part
    if (!styleMapStatics.has(part)) {
        part.committer.element.style.cssText =
            part.committer.strings.join(' ');
        styleMapStatics.set(part, true);
    }
    const style = part.committer.element.style;
    // Remove old properties that no longer exist in styleInfo
    const oldInfo = styleMapCache.get(part);
    for (const name in oldInfo) {
        if (!(name in styleInfo)) {
            if (name.indexOf('-') === -1) {
                // tslint:disable-next-line:no-any
                style[name] = null;
            }
            else {
                style.removeProperty(name);
            }
        }
    }
    // Add or update properties
    for (const name in styleInfo) {
        if (name.indexOf('-') === -1) {
            // tslint:disable-next-line:no-any
            style[name] = styleInfo[name];
        }
        else {
            style.setProperty(name, styleInfo[name]);
        }
    }
    styleMapCache.set(part, styleInfo);
});

const litRender = (templateResult, domNode, styles, { eventContext } = {}) => {
	if (styles) {
		templateResult = html`<style>${styles}</style>${templateResult}`;
	}
	render(templateResult, domNode, { eventContext });
};

const supportedLocales = ["ar", "ar_EG", "ar_SA", "bg", "ca", "cs", "da", "de", "de_AT", "de_CH", "el", "el_CY", "en", "en_AU", "en_GB", "en_HK", "en_IE", "en_IN", "en_NZ", "en_PG", "en_SG", "en_ZA", "es", "es_AR", "es_BO", "es_CL", "es_CO", "es_MX", "es_PE", "es_UY", "es_VE", "et", "fa", "fi", "fr", "fr_BE", "fr_CA", "fr_CH", "fr_LU", "he", "hi", "hr", "hu", "id", "it", "it_CH", "ja", "kk", "ko", "lt", "lv", "ms", "nb", "nl", "nl_BE", "pl", "pt", "pt_PT", "ro", "ru", "ru_UA", "sk", "sl", "sr", "sv", "th", "tr", "uk", "vi", "zh_CN", "zh_HK", "zh_SG", "zh_TW"];

const cldrData = {};
const cldrUrls = {};

// externally configurable mapping function for resolving (localeId -> URL)
// default implementation - ui5 CDN
let cldrMappingFn = locale => `https://ui5.sap.com/1.60.2/resources/sap/ui/core/cldr/${locale}.json`;

const M_ISO639_OLD_TO_NEW$3 = {
	"iw": "he",
	"ji": "yi",
	"in": "id",
	"sh": "sr",
};

const calcLocale = (language, region, script) => {
	// normalize language and handle special cases
	language = (language && M_ISO639_OLD_TO_NEW$3[language]) || language;
	// Special case 1: in an SAP context, the inclusive language code "no" always means Norwegian Bokmal ("nb")
	if (language === "no") {
		language = "nb";
	}
	// Special case 2: for Chinese, derive a default region from the script (this behavior is inherited from Java)
	if (language === "zh" && !region) {
		if (script === "Hans") {
			region = "CN";
		} else if (script === "Hant") {
			region = "TW";
		}
	}

	// try language + region
	let localeId = `${language}_${region}`;
	if (!supportedLocales.includes(localeId)) {
		// fallback to language only
		localeId = language;
	}
	if (!supportedLocales.includes(localeId)) {
		// fallback to english
		localeId = "en";
	}

	return localeId;
};


const resolveMissingMappings = () => {
	if (!cldrMappingFn) {
		return;
	}

	const missingLocales = supportedLocales.filter(locale => !cldrData[locale] && !cldrUrls[locale]);
	missingLocales.forEach(locale => {
		cldrUrls[locale] = cldrMappingFn(locale);
	});
};

const fetchCldrData = async (language, region, script) => {
	resolveMissingMappings();
	const localeId = calcLocale(language, region, script);

	const cldrObj = cldrData[localeId];
	const url = cldrUrls[localeId];

	if (cldrObj) {
		// inlined from build or fetched independently
		registerModuleContent(`sap/ui/core/cldr/${localeId}.json`, JSON.stringify(cldrObj));
	} else if (url) {
		// fetch it
		const cldrText = await fetchTextOnce(url);
		registerModuleContent(`sap/ui/core/cldr/${localeId}.json`, cldrText);
	}
};

const whenDOMReady = () => {
	return new Promise(resolve => {
		if (document.body) {
			resolve();
		} else {
			document.addEventListener("DOMContentLoaded", () => {
				resolve();
			});
		}
	});
};

const EventEnrichment = {};

let enriched = false;

EventEnrichment.run = function run() {
	if (enriched) {
		return;
	}

	const stopPropagationSet = new WeakSet();
	const stopImmediatePropagationSet = new WeakSet();

	const originalStopPropagation = Event.prototype.stopPropagation;
	const originalStopImmediatePropagation = Event.prototype.stopImmediatePropagation;

	Event.prototype.stopPropagation = function stopPropagation() {
		stopPropagationSet.add(this);
		return originalStopPropagation.apply(this, arguments); // eslint-disable-line
	};

	Event.prototype.isPropagationStopped = function isPropagationStopped() {
		return stopPropagationSet.has(this);
	};

	Event.prototype.stopImmediatePropagation = function stopImmediatePropagation() {
		stopImmediatePropagationSet.add(this);
		return originalStopImmediatePropagation.apply(this, arguments); // eslint-disable-line
	};

	Event.prototype.isImmediatePropagationStopped = function isImmediatePropagationStopped() {
		return stopImmediatePropagationSet.has(this);
	};

	enriched = true;
};

/**
 * CSS font family used for the icons provided by SAP.
 */
const SAP_ICON_FONT_FAMILY = "SAP-icons";

/* CDN Location */
let iconFontWoff = "https://ui5.sap.com/sdk/resources/sap/ui/core/themes/base/fonts/SAP-icons.woff?ui5-webcomponents";
let iconFontWoff2 = "https://ui5.sap.com/sdk/resources/sap/ui/core/themes/base/fonts/SAP-icons.woff2?ui5-webcomponents";


const insertIconFontFace = (woff2Location = iconFontWoff2, woffLocation = iconFontWoff) => {
	const fontFace = SAP_ICON_FONT_FAMILY;

	/* eslint-disable */
	// load the font asynchronously via CSS
	const fontFaceCSS = "@font-face {" +
			"font-family: '" + fontFace + "';" +
			"src: url('" + woff2Location + "') format('woff2')," + /* Chrome 36+, Firefox 39+, Safari 10+, Edge 14+, Chrome 51+ for Android, PhantomJS 2.1.1+ */
			"url('" + woffLocation + "') format('woff')," + /* IE9+, Safari 5.1+, iOS 5.1+, Android Browser 4.4+, IE Mobile 11+ */
			"local('" + fontFace + "');" + /* fallback to local installed font in case it can't be loaded (e.g. font download is disabled due to browser security settings) */
			"font-weight: normal;" +
			"font-style: normal;" +
			"}";
	/* eslint-enable */

	const style = document.createElement("style");
	style.type = "text/css";
	style.textContent = fontFaceCSS;
	document.head.appendChild(style);
};

const ManagedEvents = {};

ManagedEvents.events = [
	"click",
	"dblclick",
	"contextmenu",
	"focusin",
	"focusout",
	"keydown",
	"keypress",
	"keyup",
	"mousedown",
	"mouseout",
	"mouseover",
	"mouseup",
	"select",
	"selectstart",
	"dragstart",
	"dragenter",
	"dragover",
	"dragleave",
	"dragend",
	"drop",
	"paste",
	"cut",
	"input",
	"touchstart",
	"touchend",
	"touchmove",
	"touchcancel",
];

ManagedEvents.bindAllEvents = callback => {
	if (callback) {
		ManagedEvents.events.forEach(event => {
			document.addEventListener(event, callback);
		});
	}
};

ManagedEvents.unbindAllEvents = callback => {
	if (callback) {
		ManagedEvents.events.forEach(event => {
			document.removeEventListener(event, callback);
		});
	}
};

const getOriginalEventTarget = function getOriginalEventTarget(event) {
	// Default - composedPath should be used (also covered by polyfill)
	if (typeof event.composedPath === "function") {
		const composedPath = event.composedPath();
		if (Array.isArray(composedPath) && composedPath.length) {
			return composedPath[0];
		}
	}

	// Fallback
	return event.target;
};

const handleEvent = function handleEvent(event) {
	// Get the DOM node where the original event occurred
	let target = getOriginalEventTarget(event);
	event.ui5target = target;

	// Traverse the DOM
	let shouldPropagate = true;
	while (shouldPropagate && target instanceof HTMLElement) {
		shouldPropagate = processDOMNode(target, event);
		if (shouldPropagate) {
			target = getParentDOMNode(target);
		}
	}
};


const processDOMNode = function processDOMNode(node, event) {
	if (node && node instanceof UI5Element) {
		return dispatchEvent(node, event);
	}
	return true;
};

const dispatchEvent = function dispatchEvent(element, event) {
	// Handle the original event (such as "keydown")
	element._handleEvent(event);
	if (event.isImmediatePropagationStopped()) {
		return false;
	}

	/* eslint-disable */
	if (event.isPropagationStopped()) {
		return false;
	}
	/* eslint-enable */

	return true;
};

const getParentDOMNode = function getParentDOMNode(node) {
	const parentNode = node.parentNode;

	if (parentNode && parentNode.host) {
		return parentNode.host;
	}

	return parentNode;
};


class DOMEventHandler {
	constructor() {
		throw new Error("Static class");
	}

	static start() {
		ManagedEvents.bindAllEvents(handleEvent);
	}

	static stop() {
		ManagedEvents.unbindAllEvents(handleEvent);
	}
}

let polyfillLoadedPromise;

const whenPolyfillLoaded = () => {
	if (polyfillLoadedPromise) {
		return polyfillLoadedPromise;
	}

	polyfillLoadedPromise = new Promise(resolve => {
		if (window.WebComponents && window.WebComponents.waitFor) {
			// the polyfill loader is present
			window.WebComponents.waitFor(() => {
				// the polyfills are loaded, safe to execute code depending on their APIs
				resolve();
			});
		} else {
			// polyfill loader missing, modern browsers only
			resolve();
		}
	});

	return polyfillLoadedPromise;
};

EventEnrichment.run();

let bootPromise;

const Bootstrap = {

	boot() {
		if (bootPromise) {
			return bootPromise;
		}

		bootPromise = new Promise(async resolve => {
			await whenDOMReady();
			initConfiguration();
			applyTheme();
			insertIconFontFace();
			DOMEventHandler.start();
			await whenPolyfillLoaded();
			resolve();
		});

		return bootPromise;
	},
};

const URI = {
    parse: (url) => {
        const [protocol, hostname] = url.split("://");
        const parts = { protocol, hostname, path: "/" };
        return parts;
    },
    build: ({ protocol, hostname }) => {
        return `${protocol}://${hostname}`;
    }
};

/* eslint-disable */

const SAP_ICON_FONT_FAMILY$1 = 'SAP-icons';

const iconMapping = {
	"accidental-leave": 0xe000, "account": 0xe001, "wrench": 0xe002, "windows-doors": 0xe003,
	"washing-machine": 0xe004, "visits": 0xe005, "video": 0xe006, "travel-expense": 0x1e007,
	"temperature": 0xe008, "task": 0x1e009, "synchronize": 0xe00a, "survey": 0x1e00b,
	"settings": 0xe00c, "search": 0x1e00d, "sales-document": 0x1e00e, "retail-store": 0xe00f,
	"refresh": 0xe010, "product": 0xe011, "present": 0xe012, "ppt-attachment": 0xe013,
	"pool": 0xe014, "pie-chart": 0xe015, "picture": 0xe016, "photo-voltaic": 0xe017,
	"phone": 0xe018, "pending": 0xe019, "pdf-attachment": 0xe01a, "past": 0x1e01b,
	"outgoing-call": 0xe01c, "opportunity": 0xe01d, "opportunities": 0x1e01e, "notes": 0xe01f,
	"money-bills": 0x1e020, "map": 0xe021, "log": 0xe022, "line-charts": 0xe023,
	"lightbulb": 0xe024, "leads": 0xe025, "lead": 0x1e026, "laptop": 0xe027,
	"kpi-managing-my-area": 0x1e028, "kpi-corporate-performance": 0x1e029, "incoming-call": 0xe02a, "inbox": 0xe02b,
	"horizontal-bar-chart": 0xe02c, "history": 0xe02d, "heating-cooling": 0xe02e, "gantt-bars": 0xe02f,
	"future": 0x1e030, "fridge": 0xe031, "fallback": 0xe032, "expense-report": 0x1e033,
	"excel-attachment": 0xe034, "energy-saving-lightbulb": 0xe035, "employee": 0xe036, "email": 0xe037,
	"edit": 0xe038, "duplicate": 0xe039, "download": 0xe03a, "doc-attachment": 0xe03b,
	"dishwasher": 0xe03c, "delete": 0xe03d, "decline": 0xe03e, "complete": 0x1e03f,
	"competitor": 0xe040, "collections-management": 0xe041, "chalkboard": 0x1e042, "cart": 0xe043,
	"card": 0xe044, "camera": 0xe045, "calendar": 0x1e046, "begin": 0xe047,
	"basket": 0xe048, "bar-chart": 0xe049, "attachment": 0xe04a, "arrow-top": 0xe04b,
	"arrow-right": 0xe04c, "arrow-left": 0xe04d, "arrow-bottom": 0xe04e, "approvals": 0x1e04f,
	"appointment": 0xe050, "alphabetical-order": 0x1e051, "along-stacked-chart": 0xe052, "alert": 0xe053,
	"addresses": 0xe054, "address-book": 0x1e055, "add-filter": 0xe056, "add-favorite": 0xe057,
	"add": 0xe058, "activities": 0x1e059, "action": 0xe05a, "accept": 0x1e05b,
	"hint": 0x1e05c, "group": 0xe05d, "check-availability": 0x1e05e, "weather-proofing": 0xe05f,
	"payment-approval": 0x1e060, "batch-payments": 0x1e061, "bed": 0xe062, "arobase": 0x1e063,
	"family-care": 0xe064, "favorite": 0xe065, "navigation-right-arrow": 0xe066, "navigation-left-arrow": 0xe067,
	"e-care": 0xe068, "less": 0xe069, "lateness": 0xe06a, "lab": 0xe06b,
	"internet-browser": 0xe06c, "instance": 0xe06d, "inspection": 0xe06e, "image-viewer": 0xe06f,
	"home": 0xe070, "grid": 0xe071, "goalseek": 0xe072, "general-leave-request": 0xe073,
	"create-leave-request": 0xe074, "flight": 0xe075, "filter": 0xe076, "favorite-list": 0xe077,
	"factory": 0xe078, "endoscopy": 0xe079, "employee-pane": 0xe07a, "employee-approvals": 0x1e07b,
	"email-read": 0xe07c, "electrocardiogram": 0xe07d, "documents": 0xe07e, "decision": 0xe07f,
	"database": 0xe080, "customer-history": 0xe081, "customer": 0xe082, "credit-card": 0xe083,
	"create-entry-time": 0xe084, "contacts": 0xe085, "compare": 0xe086, "clinical-order": 0xe087,
	"chain-link": 0xe088, "pull-down": 0xe089, "cargo-train": 0xe08a, "car-rental": 0xe08b,
	"business-card": 0xe08c, "bar-code": 0xe08d, "folder-blank": 0xe08e, "passenger-train": 0xe08f,
	"question-mark": 0x1e090, "world": 0xe091, "iphone": 0xe092, "ipad": 0xe093,
	"warning": 0xe094, "sort": 0xe095, "course-book": 0xe096, "course-program": 0xe097,
	"add-coursebook": 0xe098, "print": 0xe099, "save": 0xe09a, "play": 0x1e09b,
	"pause": 0xe09c, "record": 0xe09d, "response": 0xe09e, "pushpin-on": 0xe09f,
	"pushpin-off": 0xe0a0, "unfavorite": 0xe0a1, "learning-assistant": 0xe0a2, "timesheet": 0xe0a3,
	"time-entry-request": 0xe0a4, "list": 0xe0a5, "action-settings": 0xe0a6, "share": 0xe0a7,
	"feed": 0xe0a8, "role": 0xe0a9, "flag": 0x1e0aa, "post": 0xe0ab,
	"inspect": 0xe0ac, "inspect-down": 0xe0ad, "appointment-2": 0xe0ae, "target-group": 0xe0af,
	"marketing-campaign": 0xe0b0, "notification": 0xe0b1, "message-error": 0xe0b1, "comment": 0xe0b2,
	"shipping-status": 0xe0b3, "collaborate": 0xe0b4, "shortcut": 0xe0b5, "lead-outdated": 0x1e0b6,
	"tools-opportunity": 0xe0b7, "permission": 0xe0b8, "supplier": 0xe0b9, "table-view": 0xe0ba,
	"table-chart": 0xe0bb, "switch-views": 0xe0bc, "e-learning": 0xe0bd, "manager": 0xe0be,
	"switch-classes": 0xe0bf, "simple-payment": 0x1e0c0, "signature": 0xe0c1, "sales-order-item": 0x1e0c2,
	"sales-order": 0x1e0c3, "request": 0xe0c4, "receipt": 0xe0c5, "puzzle": 0xe0c6,
	"process": 0xe0c7, "private": 0xe0c8, "popup-window": 0xe0c9, "person-placeholder": 0xe0ca,
	"per-diem": 0x1e0cb, "paper-plane": 0xe0cc, "paid-leave": 0x1e0cd, "pdf-reader": 0x1e0ce,
	"overview-chart": 0xe0cf, "overlay": 0xe0d0, "org-chart": 0xe0d1, "number-sign": 0xe0d2,
	"notification-2": 0xe0d3, "my-sales-order": 0x1e0d4, "meal": 0xe0d5, "loan": 0x1e0d6,
	"order-status": 0x1e0d7, "customer-order-entry": 0x1e0d8, "performance": 0xe0d9, "menu": 0xe0da,
	"employee-lookup": 0xe0db, "education": 0xe0dc, "customer-briefing": 0xe0dd, "customer-and-contacts": 0xe0de,
	"my-view": 0xe0df, "accelerated": 0xe0e0, "to-be-reviewed": 0xe0e1, "warning2": 0xe0e2,
	"feeder-arrow": 0xe0e3, "quality-issue": 0xe0e4, "workflow-tasks": 0xe0e5, "create": 0xe0e6,
	"home-share": 0xe0e7, "globe": 0x1e0e8, "tags": 0xe0e9, "work-history": 0xe0ea,
	"x-ray": 0xe0eb, "wounds-doc": 0xe0ec, "web-cam": 0xe0ed, "waiver": 0x1e0ee,
	"vertical-bar-chart": 0xe0ef, "upstacked-chart": 0xe0f0, "trip-report": 0xe0f1, "microphone": 0xe0f2,
	"unpaid-leave": 0x1e0f3, "tree": 0xe0f4, "toaster-up": 0xe0f5, "toaster-top": 0xe0f6,
	"toaster-down": 0xe0f7, "time-account": 0xe0f8, "theater": 0xe0f9, "taxi": 0xe0fa,
	"subway-train": 0xe0fb, "study-leave": 0xe0fc, "stethoscope": 0xe0fd, "step": 0xe0fe,
	"sonography": 0xe0ff, "soccor": 0xe100, "physical-activity": 0xe101, "pharmacy": 0xe102,
	"official-service": 0xe103, "offsite-work": 0xe104, "nutrition-activity": 0xe105, "newspaper": 0xe106,
	"monitor-payments": 0x1e107, "map-2": 0xe108, "machine": 0xe109, "mri-scan": 0xe10a,
	"end-user-experience-monitoring": 0xe10b, "unwired": 0xe10c, "customer-financial-fact-sheet": 0x1e10d, "retail-store-manager": 0xe10e,
	"Netweaver-business-client": 0xe10f, "electronic-medical-record": 0xe110, "eam-work-order": 0x1e111, "customer-view": 0xe112,
	"crm-service-manager": 0xe113, "crm-sales": 0x1e114, "widgets": 0x1e115, "commission-check": 0x1e116,
	"collections-insight": 0x1e117, "clinical-tast-tracker": 0xe118, "citizen-connect": 0xe119, "cart-approval": 0x1e11a,
	"capital-projects": 0x1e11b, "bo-strategy-management": 0xe11c, "business-objects-mobile": 0xe11d, "business-objects-explorer": 0xe11e,
	"business-objects-experience": 0xe11f, "bbyd-dashboard": 0xe120, "bbyd-active-sales": 0x1e121, "business-by-design": 0x1e122,
	"business-one": 0x1e123, "sap-box": 0xe124, "manager-insight": 0xe125, "accounting-document-verification": 0x1e126,
	"hr-approval": 0x1e127, "idea-wall": 0xe128, "Chart-Tree-Map": 0xe129, "cart-5": 0xe12a,
	"cart-4": 0xe12b, "wallet": 0xe12c, "vehicle-repair": 0xe12d, "upload": 0xe12e,
	"unlocked": 0xe12f, "umbrella": 0xe130, "travel-request": 0x1e131, "travel-expense-report": 0x1e132,
	"travel-itinerary": 0xe133, "time-overtime": 0x1e134, "thing-type": 0xe135, "technical-object": 0xe136,
	"tag": 0xe137, "syringe": 0xe138, "syntax": 0xe139, "suitcase": 0xe13a,
	"simulate": 0xe13b, "shield": 0xe13c, "share-2": 0xe13d, "sales-quote": 0x1e13e,
	"repost": 0xe13f, "provision": 0xe140, "projector": 0xe141, "add-product": 0xe142,
	"pipeline-analysis": 0xe143, "add-photo": 0xe144, "palette": 0xe145, "nurse": 0xe146,
	"sales-notification": 0x1e147, "mileage": 0xe148, "meeting-room": 0xe149, "media-forward": 0x1e14a,
	"media-play": 0x1e14b, "media-pause": 0xe14c, "media-reverse": 0x1e14d, "media-rewind": 0x1e14e,
	"measurement-document": 0xe14f, "measuring-point": 0xe150, "measure": 0xe151, "map-3": 0xe152,
	"locked": 0xe153, "letter": 0xe154, "journey-arrive": 0xe155, "journey-change": 0xe156,
	"journey-depart": 0xe157, "it-system": 0xe158, "it-instance": 0xe159, "it-host": 0xe15a,
	"iphone-2": 0xe15b, "ipad-2": 0xe15c, "inventory": 0xe15d, "insurance-house": 0xe15e,
	"insurance-life": 0xe15f, "insurance-car": 0xe160, "initiative": 0xe161, "incident": 0x1e162,
	"group-2": 0xe163, "goal": 0xe164, "functional-location": 0xe165, "full-screen": 0xe166,
	"form": 0xe167, "fob-watch": 0xe168, "blank-tag": 0xe169, "family-protection": 0xe16a,
	"folder": 0xe16b, "fax-machine": 0xe16c, "example": 0xe16d, "eraser": 0xe16e,
	"employee-rejections": 0xe16f, "drop-down-list": 0xe170, "draw-rectangle": 0xe171, "document": 0xe172,
	"doctor": 0xe173, "discussion-2": 0xe174, "discussion": 0xe175, "dimension": 0xe176,
	"customer-and-supplier": 0xe177, "crop": 0xe178, "add-contact": 0xe179, "compare-2": 0xe17a,
	"color-fill": 0xe17b, "collision": 0xe17c, "curriculum": 0xe17d, "chart-axis": 0xe17e,
	"full-stacked-chart": 0xe17f, "full-stacked-column-chart": 0xe180, "vertical-bar-chart-2": 0xe181, "horizontal-bar-chart-2": 0xe182,
	"horizontal-stacked-chart": 0xe183, "vertical-stacked-chart": 0xe184, "choropleth-chart": 0x1e185, "geographic-bubble-chart": 0x1e186,
	"multiple-radar-chart": 0xe187, "radar-chart": 0xe188, "crossed-line-chart": 0xe189, "multiple-line-chart": 0xe18a,
	"multiple-bar-chart": 0xe18b, "line-chart": 0xe18c, "line-chart-dual-axis": 0xe18d, "bubble-chart": 0xe18e,
	"scatter-chart": 0xe18f, "multiple-pie-chart": 0xe190, "column-chart-dual-axis": 0xe191, "tag-cloud-chart": 0xe192,
	"area-chart": 0xe193, "cause": 0xe194, "cart-3": 0xe195, "cart-2": 0xe196,
	"bus-public-transport": 0xe197, "burglary": 0xe198, "building": 0xe199, "border": 0xe19a,
	"bookmark": 0xe19b, "badge": 0xe19c, "attachment-audio": 0xe19d, "attachment-video": 0xe19e,
	"attachment-html": 0xe19f, "attachment-photo": 0xe1a0, "attachment-e-pub": 0xe1a1, "attachment-zip-file": 0xe1a2,
	"attachment-text-file": 0xe1a3, "add-equipment": 0xe1a4, "add-activity": 0x1e1a5, "activity-individual": 0xe1a6,
	"activity-2": 0x1e1a7, "add-activity-2": 0x1e1a8, "activity-items": 0xe1a9, "activity-assigned-to-goal": 0xe1aa,
	"status-completed": 0xe1ab, "status-positive": 0xe1ab, "status-error": 0xe1ac, "status-negative": 0xe1ac,
	"status-inactive": 0xe1ad, "status-in-process": 0xe1ae, "status-critical": 0xe1ae, "blank-tag-2": 0xe1af,
	"cart-full": 0xe1b0, "locate-me": 0xe1b1, "paging": 0xe1b2, "company-view": 0xe1b3,
	"document-text": 0xe1b4, "explorer": 0xe1b5, "personnel-view": 0xe1b6, "sorting-ranking": 0xe1b7,
	"drill-down": 0xe1b8, "drill-up": 0xe1b9, "vds-file": 0xe1ba, "sap-logo-shape": 0x1e1bb,
	"folder-full": 0xe1bc, "system-exit": 0xe1bd, "system-exit-2": 0xe1be, "close-command-field": 0xe1bf,
	"open-command-field": 0xe1c0, "sys-enter-2": 0x1e1c1, "sys-enter": 0x1e1c2, "sys-help-2": 0x1e1c3,
	"sys-help": 0x1e1c4, "sys-back": 0xe1c5, "sys-back-2": 0xe1c6, "sys-cancel": 0xe1c7,
	"sys-cancel-2": 0xe1c8, "open-folder": 0xe1c9, "sys-find-next": 0xe1ca, "sys-find": 0xe1cb,
	"sys-monitor": 0xe1cc, "sys-prev-page": 0xe1cd, "sys-first-page": 0xe1ce, "sys-next-page": 0xe1cf,
	"sys-last-page": 0xe1d0, "generate-shortcut": 0xe1d1, "create-session": 0xe1d2, "display-more": 0xe1d3,
	"enter-more": 0xe1d4, "zoom-in": 0xe1d5, "zoom-out": 0xe1d6, "header": 0xe1d7,
	"detail-view": 0xe1d8, "show-edit": 0xe1d8, "collapse": 0xe1d9, "expand": 0xe1da, "positive": 0xe1db,
	"negative": 0xe1dc, "display": 0xe1dd, "menu2": 0xe1de, "redo": 0xe1df,
	"undo": 0xe1e0, "navigation-up-arrow": 0xe1e1, "navigation-down-arrow": 0xe1e2, "down": 0xe1e3,
	"up": 0xe1e4, "shelf": 0xe1e5, "background": 0xe1e6, "resize": 0xe1e7,
	"move": 0xe1e8, "show": 0xe1e9, "hide": 0xe1ea, "nav-back": 0xe1eb,
	"error": 0xe1ec, "slim-arrow-right": 0xe1ed, "slim-arrow-left": 0xe1ee, "slim-arrow-down": 0xe1ef,
	"slim-arrow-up": 0xe1f0, "forward": 0xe1f1, "overflow": 0xe1f2, "value-help": 0xe1f3,
	"multi-select": 0x1e1f4, "exit-full-screen": 0xe1f5, "sys-add": 0xe1f6, "sys-minus": 0xe1f7,
	"dropdown": 0xe1f8, "expand-group": 0xe1f9, "collapse-group": 0xe200, "vertical-grip": 0xe1fa,
	"horizontal-grip": 0xe1fb, "sort-descending": 0xe1fc, "sort-ascending": 0xe1fd, "arrow-down": 0xe1fe,
	"legend": 0xe1ff, "message-warning": 0xe201, "message-information": 0x1e202, "message-success": 0x1e203,
	"restart": 0xe204, "stop": 0xe205, "add-process": 0xe206, "cancel-maintenance": 0xe207,
	"activate": 0xe208, "resize-horizontal": 0xe209, "resize-vertical": 0xe20a, "connected": 0xe20b,
	"disconnected": 0xe20c, "edit-outside": 0xe20d, "key": 0xe20e, "minimize": 0xe20f,
	"back-to-top": 0xe210, "hello-world": 0xe211, "outbox": 0xe212, "donut-chart": 0xe213,
	"heatmap-chart": 0xe214, "horizontal-bullet-chart": 0xe215, "vertical-bullet-chart": 0xe216, "call": 0xe217,
	"download-from-cloud": 0xe218, "upload-to-cloud": 0xe219, "jam": 0xe21a, "sap-ui5": 0xe21b,
	"message-popup": 0xe21c, "cloud": 0xe21d, "horizontal-waterfall-chart": 0x1e21e, "vertical-waterfall-chart": 0x1e21f,
	"broken-link": 0xe220, "headset": 0xe221, "thumb-up": 0x1e222, "thumb-down": 0x1e223,
	"multiselect-all": 0x1e224, "multiselect-none": 0x1e225, "scissors": 0xe226, "sound": 0x1e227,
	"sound-loud": 0x1e228, "sound-off": 0x1e229, "date-time": 0x1e22a, "user-settings": 0xe22b,
	"key-user-settings": 0xe22c, "developer-settings": 0xe22d, "text-formatting": 0x1e22e, "bold-text": 0x1e22f,
	"italic-text": 0x1e230, "underline-text": 0x1e231, "text-align-justified": 0x1e232, "text-align-left": 0x1e233,
	"text-align-center": 0x1e234, "text-align-right": 0x1e235, "bullet-text": 0x1e236, "numbered-text": 0x1e237,
	"co": 0xe238, "ui-notifications": 0xe239, "bell": 0xe23a, "cancel-share": 0xe23b,
	"write-new-document": 0xe23c, "write-new": 0xe23d, "cancel": 0x1e23e, "screen-split-one": 0xe23f,
	"screen-split-two": 0xe240, "screen-split-three": 0xe241, "customize": 0xe242, "user-edit": 0xe243,
	"source-code": 0xe244, "copy": 0xe245, "paste": 0xe246, "line-chart-time-axis": 0x1e247,
	"clear-filter": 0xe248, "reset": 0xe249, "trend-up": 0xe24a, "trend-down": 0xe24b,
	"cursor-arrow": 0xe24c, "add-document": 0xe24d, "create-form": 0xe24e, "resize-corner": 0xe24f,
	"chevron-phase": 0xe250, "chevron-phase-2": 0xe251, "rhombus-milestone": 0xe252, "rhombus-milestone-2": 0xe253,
	"circle-task": 0xe254, "circle-task-2": 0xe255, "project-definition-triangle": 0xe256, "project-definition-triangle-2": 0xe257,
	"master-task-triangle": 0xe258, "master-task-triangle-2": 0xe259, "program-triangles": 0xe25a, "program-triangles-2": 0xe25b,
	"mirrored-task-circle": 0xe25c, "mirrored-task-circle-2": 0xe25d, "checklist-item": 0xe25e, "checklist-item-2": 0xe25f,
	"checklist": 0xe260, "checklist-2": 0xe261, "chart-table-view": 0xe262, "filter-analytics": 0xe263, "filter-facets": 0xe264,
	"filter-fields": 0xe265, "indent": 0xe266, "outdent": 0xe267, "heading1": 0x1e268, "heading2": 0x1e269, "heading3": 0x1e26a,
	"decrease-line-height": 0xe26b, "increase-line-height": 0xe26c, "fx": 0x1e26d, "add-folder": 0xe26e, "away": 0xe26f,
	"busy": 0xe270, "appear-offline": 0xe271, "blur": 0xe272, "pixelate": 0xe273,
	"horizontal-combination-chart": 0xe274, "add-employee": 0xe275, "text-color": 0x1e276,
	"browse-folder": 0xe277, "primary-key": 0xe278, "two-keys": 0xe279,
	"strikethrough": 0xe27a, "text": 0xe27b, "responsive": 0xe27c, "desktop-mobile": 0xe27d,
	"table-row": 0xe27e, "table-column": 0xe27f, "validate": 0x1e280, "keyboard-and-mouse": 0xe281,
	"touch": 0xe282, "expand-all": 0xe283, "collapse-all": 0xe284, "combine": 0xe285, "split": 0xe286
};

/* eslint-enable */
const getIconURI = iconName => {
	return `sap-icon://${iconName}`;
};

const getIconInfo = iconURI => {
	if (!isIconURI(iconURI)) {
		console.warn(`Invalid icon URI ${iconURI}`); /* eslint-disable-line */
		return;
	}

	let iconName = URI.parse(iconURI).hostname;

	/* when "sap-icon://" is skipped, but icon is valid */
	if (iconURI.indexOf("sap-icon://") === -1) {
		iconName = URI.parse(iconURI).protocol;
	}

	return {
		fontFamily: SAP_ICON_FONT_FAMILY$1,
		uri: getIconURI(iconName),
		content: `${stringFromCharCode(iconMapping[iconName])}`,
	};
};

const isIconURI = uri => {
	return /sap-icon:\/\//.test(uri) || iconMapping.hasOwnProperty(uri); /* eslint-disable-line */
};

const stringFromCharCode = code => {
	return String.fromCharCode(typeof code === "number" ? code : parseInt(code, 16));
};

const features = new Map();

const registerFeature = (name, feature) => {
	features.set(name, feature);
};

const getFeature = name => {
	return features.get(name);
};

var fnEqual = function (a, b, maxDepth, contains, depth) {
    if (typeof maxDepth == 'boolean') {
        contains = maxDepth;
        maxDepth = undefined;
    }
    if (!depth) {
        depth = 0;
    }
    if (!maxDepth) {
        maxDepth = 10;
    }
    if (depth > maxDepth) {
        Log.warning('deepEqual comparison exceeded maximum recursion depth of ' + maxDepth + '. Treating values as unequal');
        return false;
    }
    if (a === b) {
        return true;
    }
    var bIsReallyNaN = typeof a === 'number' && typeof b === 'number' && isNaN(a) && isNaN(b);
    if (bIsReallyNaN) {
        return true;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
        if (!contains && a.length !== b.length) {
            return false;
        }
        if (a.length > b.length) {
            return false;
        }
        for (var i = 0; i < a.length; i++) {
            if (!fnEqual(a[i], b[i], maxDepth, contains, depth + 1)) {
                return false;
            }
        }
        return true;
    }
    if (typeof a == 'object' && typeof b == 'object') {
        if (!a || !b) {
            return false;
        }
        if (a.constructor !== b.constructor) {
            return false;
        }
        if (!contains && Object.keys(a).length !== Object.keys(b).length) {
            return false;
        }
        if (a instanceof Node) {
            return a.isEqualNode(b);
        }
        if (a instanceof Date) {
            return a.valueOf() === b.valueOf();
        }
        for (var i in a) {
            if (!fnEqual(a[i], b[i], maxDepth, contains, depth + 1)) {
                return false;
            }
        }
        return true;
    }
    return false;
};

var DateFormat = function () {
    throw new Error();
};
var mCldrDatePattern = {};
DateFormat.oDateInfo = {
    oDefaultFormatOptions: {
        style: 'medium',
        relativeScale: 'day',
        relativeStyle: 'wide'
    },
    aFallbackFormatOptions: [
        { style: 'short' },
        { style: 'medium' },
        { pattern: 'yyyy-MM-dd' },
        {
            pattern: 'yyyyMMdd',
            strictParsing: true
        }
    ],
    bShortFallbackFormatOptions: true,
    bPatternFallbackWithoutDelimiter: true,
    getPattern: function (oLocaleData, sStyle, sCalendarType) {
        return oLocaleData.getDatePattern(sStyle, sCalendarType);
    },
    oRequiredParts: {
        'text': true,
        'year': true,
        'weekYear': true,
        'month': true,
        'day': true
    },
    aRelativeScales: [
        'year',
        'month',
        'week',
        'day'
    ],
    aRelativeParseScales: [
        'year',
        'quarter',
        'month',
        'week',
        'day',
        'hour',
        'minute',
        'second'
    ],
    aIntervalCompareFields: [
        'FullYear',
        'Quarter',
        'Month',
        'Week',
        'Date'
    ]
};
DateFormat.oDateTimeInfo = {
    oDefaultFormatOptions: {
        style: 'medium',
        relativeScale: 'auto',
        relativeStyle: 'wide'
    },
    aFallbackFormatOptions: [
        { style: 'short' },
        { style: 'medium' },
        { pattern: 'yyyy-MM-dd\'T\'HH:mm:ss' },
        { pattern: 'yyyyMMdd HHmmss' }
    ],
    getPattern: function (oLocaleData, sStyle, sCalendarType) {
        var iSlashIndex = sStyle.indexOf('/');
        if (iSlashIndex > 0) {
            return oLocaleData.getCombinedDateTimePattern(sStyle.substr(0, iSlashIndex), sStyle.substr(iSlashIndex + 1), sCalendarType);
        } else {
            return oLocaleData.getCombinedDateTimePattern(sStyle, sStyle, sCalendarType);
        }
    },
    oRequiredParts: {
        'text': true,
        'year': true,
        'weekYear': true,
        'month': true,
        'day': true,
        'hour0_23': true,
        'hour1_24': true,
        'hour0_11': true,
        'hour1_12': true
    },
    aRelativeScales: [
        'year',
        'month',
        'week',
        'day',
        'hour',
        'minute',
        'second'
    ],
    aRelativeParseScales: [
        'year',
        'quarter',
        'month',
        'week',
        'day',
        'hour',
        'minute',
        'second'
    ],
    aIntervalCompareFields: [
        'FullYear',
        'Quarter',
        'Month',
        'Week',
        'Date',
        'DayPeriod',
        'Hours',
        'Minutes',
        'Seconds'
    ]
};
DateFormat.oTimeInfo = {
    oDefaultFormatOptions: {
        style: 'medium',
        relativeScale: 'auto',
        relativeStyle: 'wide'
    },
    aFallbackFormatOptions: [
        { style: 'short' },
        { style: 'medium' },
        { pattern: 'HH:mm:ss' },
        { pattern: 'HHmmss' }
    ],
    getPattern: function (oLocaleData, sStyle, sCalendarType) {
        return oLocaleData.getTimePattern(sStyle, sCalendarType);
    },
    oRequiredParts: {
        'text': true,
        'hour0_23': true,
        'hour1_24': true,
        'hour0_11': true,
        'hour1_12': true
    },
    aRelativeScales: [
        'hour',
        'minute',
        'second'
    ],
    aRelativeParseScales: [
        'year',
        'quarter',
        'month',
        'week',
        'day',
        'hour',
        'minute',
        'second'
    ],
    aIntervalCompareFields: [
        'DayPeriod',
        'Hours',
        'Minutes',
        'Seconds'
    ]
};
DateFormat.getInstance = function (oFormatOptions, oLocale) {
    return this.getDateInstance(oFormatOptions, oLocale);
};
DateFormat.getDateInstance = function (oFormatOptions, oLocale) {
    return this.createInstance(oFormatOptions, oLocale, this.oDateInfo);
};
DateFormat.getDateTimeInstance = function (oFormatOptions, oLocale) {
    return this.createInstance(oFormatOptions, oLocale, this.oDateTimeInfo);
};
DateFormat.getTimeInstance = function (oFormatOptions, oLocale) {
    return this.createInstance(oFormatOptions, oLocale, this.oTimeInfo);
};
function createIntervalPatternWithNormalConnector(oFormat) {
    var sPattern = oFormat.oLocaleData.getIntervalPattern('', oFormat.oFormatOptions.calendarType);
    sPattern = sPattern.replace(/[^\{\}01 ]/, '-');
    return sPattern.replace(/\{(0|1)\}/g, oFormat.oFormatOptions.pattern);
}
DateFormat.createInstance = function (oFormatOptions, oLocale, oInfo) {
    var oFormat = Object.create(this.prototype);
    if (oFormatOptions instanceof Locale$1) {
        oLocale = oFormatOptions;
        oFormatOptions = undefined;
    }
    if (!oLocale) {
        oLocale = sap.ui.getWCCore().getFormatSettings().getFormatLocale();
    }
    oFormat.oLocale = oLocale;
    oFormat.oLocaleData = LocaleData.getInstance(oLocale);
    oFormat.oFormatOptions = jQuery.extend(false, {}, oInfo.oDefaultFormatOptions, oFormatOptions);
    if (!oFormat.oFormatOptions.calendarType) {
        oFormat.oFormatOptions.calendarType = sap.ui.getWCCore().getConfiguration().getCalendarType();
    }
    if (!oFormat.oFormatOptions.pattern) {
        if (oFormat.oFormatOptions.format) {
            oFormat.oFormatOptions.pattern = oFormat.oLocaleData.getCustomDateTimePattern(oFormat.oFormatOptions.format, oFormat.oFormatOptions.calendarType);
        } else {
            oFormat.oFormatOptions.pattern = oInfo.getPattern(oFormat.oLocaleData, oFormat.oFormatOptions.style, oFormat.oFormatOptions.calendarType);
        }
    }
    if (oFormat.oFormatOptions.interval) {
        if (oFormat.oFormatOptions.format) {
            oFormat.intervalPatterns = oFormat.oLocaleData.getCustomIntervalPattern(oFormat.oFormatOptions.format, null, oFormat.oFormatOptions.calendarType);
            if (typeof oFormat.intervalPatterns === 'string') {
                oFormat.intervalPatterns = [oFormat.intervalPatterns];
            }
            oFormat.intervalPatterns.push(oFormat.oLocaleData.getCustomDateTimePattern(oFormat.oFormatOptions.format, oFormat.oFormatOptions.calendarType));
        } else {
            oFormat.intervalPatterns = [
                oFormat.oLocaleData.getCombinedIntervalPattern(oFormat.oFormatOptions.pattern, oFormat.oFormatOptions.calendarType),
                oFormat.oFormatOptions.pattern
            ];
        }
        var sCommonConnectorPattern = createIntervalPatternWithNormalConnector(oFormat);
        oFormat.intervalPatterns.push(sCommonConnectorPattern);
    }
    if (!oFormat.oFormatOptions.fallback) {
        if (!oInfo.oFallbackFormats) {
            oInfo.oFallbackFormats = {};
        }
        var sLocale = oLocale.toString(), sCalendarType = oFormat.oFormatOptions.calendarType, sKey = sLocale + '-' + sCalendarType, sPattern, aFallbackFormatOptions;
        if (oFormat.oFormatOptions.pattern && oInfo.bPatternFallbackWithoutDelimiter) {
            sKey = sKey + '-' + oFormat.oFormatOptions.pattern;
        }
        if (oFormat.oFormatOptions.interval) {
            sKey = sKey + '-' + 'interval';
        }
        var oFallbackFormats = oInfo.oFallbackFormats[sKey] ? Object.assign({}, oInfo.oFallbackFormats[sKey]) : undefined;
        if (!oFallbackFormats) {
            aFallbackFormatOptions = oInfo.aFallbackFormatOptions;
            if (oInfo.bShortFallbackFormatOptions) {
                sPattern = oInfo.getPattern(oFormat.oLocaleData, 'short');
                aFallbackFormatOptions = aFallbackFormatOptions.concat(DateFormat._createFallbackOptionsWithoutDelimiter(sPattern));
            }
            if (oFormat.oFormatOptions.pattern && oInfo.bPatternFallbackWithoutDelimiter) {
                aFallbackFormatOptions = DateFormat._createFallbackOptionsWithoutDelimiter(oFormat.oFormatOptions.pattern).concat(aFallbackFormatOptions);
            }
            oFallbackFormats = DateFormat._createFallbackFormat(aFallbackFormatOptions, sCalendarType, oLocale, oInfo, oFormat.oFormatOptions.interval);
        }
        oFormat.aFallbackFormats = oFallbackFormats;
    }
    oFormat.oRequiredParts = oInfo.oRequiredParts;
    oFormat.aRelativeScales = oInfo.aRelativeScales;
    oFormat.aRelativeParseScales = oInfo.aRelativeParseScales;
    oFormat.aIntervalCompareFields = oInfo.aIntervalCompareFields;
    oFormat.init();
    return oFormat;
};
DateFormat.prototype.init = function () {
    var sCalendarType = this.oFormatOptions.calendarType;
    this.aMonthsAbbrev = this.oLocaleData.getMonths('abbreviated', sCalendarType);
    this.aMonthsWide = this.oLocaleData.getMonths('wide', sCalendarType);
    this.aMonthsNarrow = this.oLocaleData.getMonths('narrow', sCalendarType);
    this.aMonthsAbbrevSt = this.oLocaleData.getMonthsStandAlone('abbreviated', sCalendarType);
    this.aMonthsWideSt = this.oLocaleData.getMonthsStandAlone('wide', sCalendarType);
    this.aMonthsNarrowSt = this.oLocaleData.getMonthsStandAlone('narrow', sCalendarType);
    this.aDaysAbbrev = this.oLocaleData.getDays('abbreviated', sCalendarType);
    this.aDaysWide = this.oLocaleData.getDays('wide', sCalendarType);
    this.aDaysNarrow = this.oLocaleData.getDays('narrow', sCalendarType);
    this.aDaysShort = this.oLocaleData.getDays('short', sCalendarType);
    this.aDaysAbbrevSt = this.oLocaleData.getDaysStandAlone('abbreviated', sCalendarType);
    this.aDaysWideSt = this.oLocaleData.getDaysStandAlone('wide', sCalendarType);
    this.aDaysNarrowSt = this.oLocaleData.getDaysStandAlone('narrow', sCalendarType);
    this.aDaysShortSt = this.oLocaleData.getDaysStandAlone('short', sCalendarType);
    this.aQuartersAbbrev = this.oLocaleData.getQuarters('abbreviated', sCalendarType);
    this.aQuartersWide = this.oLocaleData.getQuarters('wide', sCalendarType);
    this.aQuartersNarrow = this.oLocaleData.getQuarters('narrow', sCalendarType);
    this.aQuartersAbbrevSt = this.oLocaleData.getQuartersStandAlone('abbreviated', sCalendarType);
    this.aQuartersWideSt = this.oLocaleData.getQuartersStandAlone('wide', sCalendarType);
    this.aQuartersNarrowSt = this.oLocaleData.getQuartersStandAlone('narrow', sCalendarType);
    this.aErasNarrow = this.oLocaleData.getEras('narrow', sCalendarType);
    this.aErasAbbrev = this.oLocaleData.getEras('abbreviated', sCalendarType);
    this.aErasWide = this.oLocaleData.getEras('wide', sCalendarType);
    this.aDayPeriods = this.oLocaleData.getDayPeriods('abbreviated', sCalendarType);
    this.aFormatArray = this.parseCldrDatePattern(this.oFormatOptions.pattern);
    this.sAllowedCharacters = this.getAllowedCharacters(this.aFormatArray);
};
DateFormat._createFallbackFormat = function (aFallbackFormatOptions, sCalendarType, oLocale, oInfo, bInterval) {
    return aFallbackFormatOptions.map(function (oOptions) {
        var oFormatOptions = Object.assign({}, oOptions);
        if (bInterval) {
            oFormatOptions.interval = true;
        }
        oFormatOptions.calendarType = sCalendarType;
        oFormatOptions.fallback = true;
        var oFallbackFormat = DateFormat.createInstance(oFormatOptions, oLocale, oInfo);
        oFallbackFormat.bIsFallback = true;
        return oFallbackFormat;
    });
};
DateFormat._createFallbackOptionsWithoutDelimiter = function (sBasePattern) {
    var rNonDateFields = /[^dMyGU]/g, oDayReplace = {
            regex: /d+/g,
            replace: 'dd'
        }, oMonthReplace = {
            regex: /M+/g,
            replace: 'MM'
        }, oYearReplace = {
            regex: /[yU]+/g,
            replace: [
                'yyyy',
                'yy'
            ]
        };
    sBasePattern = sBasePattern.replace(rNonDateFields, '');
    sBasePattern = sBasePattern.replace(oDayReplace.regex, oDayReplace.replace);
    sBasePattern = sBasePattern.replace(oMonthReplace.regex, oMonthReplace.replace);
    return oYearReplace.replace.map(function (sReplace) {
        return {
            pattern: sBasePattern.replace(oYearReplace.regex, sReplace),
            strictParsing: true
        };
    });
};
var oParseHelper = {
    isNumber: function (iCharCode) {
        return iCharCode >= 48 && iCharCode <= 57;
    },
    findNumbers: function (sValue, iMaxLength) {
        var iLength = 0;
        while (iLength < iMaxLength && this.isNumber(sValue.charCodeAt(iLength))) {
            iLength++;
        }
        if (typeof sValue !== 'string') {
            sValue = sValue.toString();
        }
        return sValue.substr(0, iLength);
    },
    findEntry: function (sValue, aList) {
        var iFoundIndex = -1, iMatchedLength = 0;
        for (var j = 0; j < aList.length; j++) {
            if (aList[j] && aList[j].length > iMatchedLength && sValue.indexOf(aList[j]) === 0) {
                iFoundIndex = j;
                iMatchedLength = aList[j].length;
            }
        }
        return {
            index: iFoundIndex,
            value: iFoundIndex === -1 ? null : aList[iFoundIndex]
        };
    },
    parseTZ: function (sValue, bISO) {
        var iLength = 0;
        var iTZFactor = sValue.charAt(0) == '+' ? -1 : 1;
        var sPart;
        iLength++;
        sPart = this.findNumbers(sValue.substr(iLength), 2);
        var iTZDiffHour = parseInt(sPart);
        iLength += 2;
        if (bISO) {
            iLength++;
        }
        sPart = this.findNumbers(sValue.substr(iLength), 2);
        iLength += 2;
        var iTZDiff = parseInt(sPart);
        return {
            length: iLength,
            tzDiff: (iTZDiff + 60 * iTZDiffHour) * iTZFactor
        };
    },
    checkValid: function (sType, bPartInvalid, oFormat) {
        if (sType in oFormat.oRequiredParts && bPartInvalid) {
            return false;
        }
    }
};
DateFormat.prototype.oSymbols = {
    '': {
        name: 'text',
        format: function (oField, oDate, bUTC, oFormat) {
            return oField.value;
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var sChar;
            var bValid = true;
            var iValueIndex = 0;
            var iPatternIndex = 0;
            for (; iPatternIndex < oPart.value.length; iPatternIndex++) {
                sChar = oPart.value.charAt(iPatternIndex);
                if (sChar !== ' ') {
                    if (sValue.charAt(iValueIndex) !== sChar) {
                        bValid = false;
                    }
                    iValueIndex++;
                } else {
                    while (sValue.charAt(iValueIndex) === ' ') {
                        iValueIndex++;
                    }
                }
                if (!bValid) {
                    break;
                }
            }
            if (bValid) {
                return { length: iValueIndex };
            } else {
                var bPartInvalid = false;
                if (oConfig.index < oConfig.formatArray.length - 1) {
                    bPartInvalid = oConfig.formatArray[oConfig.index + 1].type in oFormat.oRequiredParts;
                }
                return { valid: oParseHelper.checkValid(oPart.type, bPartInvalid, oFormat) };
            }
        }
    },
    'G': {
        name: 'era',
        format: function (oField, oDate, bUTC, oFormat) {
            var iEra = bUTC ? oDate.getUTCEra() : oDate.getEra();
            if (oField.digits <= 3) {
                return oFormat.aErasAbbrev[iEra];
            } else if (oField.digits === 4) {
                return oFormat.aErasWide[iEra];
            } else {
                return oFormat.aErasNarrow[iEra];
            }
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var aErasVariants = [
                oFormat.aErasWide,
                oFormat.aErasAbbrev,
                oFormat.aErasNarrow
            ];
            for (var i = 0; i < aErasVariants.length; i++) {
                var aVariants = aErasVariants[i];
                var oFound = oParseHelper.findEntry(sValue, aVariants);
                if (oFound.index !== -1) {
                    return {
                        era: oFound.index,
                        length: oFound.value.length
                    };
                }
            }
            return {
                era: oFormat.aErasWide.length - 1,
                valid: oParseHelper.checkValid(oPart.type, true, oFormat)
            };
        }
    },
    'y': {
        name: 'year',
        format: function (oField, oDate, bUTC, oFormat) {
            var iYear = bUTC ? oDate.getUTCFullYear() : oDate.getFullYear();
            var sYear = String(iYear);
            var sCalendarType = oFormat.oFormatOptions.calendarType;
            if (oField.digits == 2 && sYear.length > 2) {
                sYear = sYear.substr(sYear.length - 2);
            }
            if (sCalendarType != CalendarType.Japanese && oField.digits == 1 && iYear < 100) {
                sYear = sYear.padStart(4, '0');
            }
            return sYear.padStart(oField.digits, '0');
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var sCalendarType = oFormat.oFormatOptions.calendarType;
            var sPart;
            if (oPart.digits == 1) {
                sPart = oParseHelper.findNumbers(sValue, 4);
            } else if (oPart.digits == 2) {
                sPart = oParseHelper.findNumbers(sValue, 2);
            } else {
                sPart = oParseHelper.findNumbers(sValue, oPart.digits);
            }
            var iYear = parseInt(sPart);
            if (sCalendarType != CalendarType.Japanese && sPart.length <= 2) {
                var oCurrentDate = UniversalDate.getInstance(new Date(), sCalendarType), iCurrentYear = oCurrentDate.getFullYear(), iCurrentCentury = Math.floor(iCurrentYear / 100), iYearDiff = iCurrentCentury * 100 + iYear - iCurrentYear;
                if (iYearDiff < -70) {
                    iYear += (iCurrentCentury + 1) * 100;
                } else if (iYearDiff < 30) {
                    iYear += iCurrentCentury * 100;
                } else {
                    iYear += (iCurrentCentury - 1) * 100;
                }
            }
            return {
                length: sPart.length,
                valid: oParseHelper.checkValid(oPart.type, sPart === '', oFormat),
                year: iYear
            };
        }
    },
    'Y': {
        name: 'weekYear',
        format: function (oField, oDate, bUTC, oFormat) {
            var oWeek = bUTC ? oDate.getUTCWeek() : oDate.getWeek();
            var iWeekYear = oWeek.year;
            var sWeekYear = String(iWeekYear);
            var sCalendarType = oFormat.oFormatOptions.calendarType;
            if (oField.digits == 2 && sWeekYear.length > 2) {
                sWeekYear = sWeekYear.substr(sWeekYear.length - 2);
            }
            if (sCalendarType != CalendarType.Japanese && oField.digits == 1 && iWeekYear < 100) {
                sWeekYear = sWeekYear.padStart(4, '0');
            }
            return sWeekYear.padStart(oField.digits, '0');
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var sCalendarType = oFormat.oFormatOptions.calendarType;
            var sPart;
            if (oPart.digits == 1) {
                sPart = oParseHelper.findNumbers(sValue, 4);
            } else if (oPart.digits == 2) {
                sPart = oParseHelper.findNumbers(sValue, 2);
            } else {
                sPart = oParseHelper.findNumbers(sValue, oPart.digits);
            }
            var iYear = parseInt(sPart);
            var iWeekYear;
            if (sCalendarType != CalendarType.Japanese && sPart.length <= 2) {
                var oCurrentDate = UniversalDate.getInstance(new Date(), sCalendarType), iCurrentYear = oCurrentDate.getFullYear(), iCurrentCentury = Math.floor(iCurrentYear / 100), iYearDiff = iCurrentCentury * 100 + iWeekYear - iCurrentYear;
                if (iYearDiff < -70) {
                    iWeekYear += (iCurrentCentury + 1) * 100;
                } else if (iYearDiff < 30) {
                    iWeekYear += iCurrentCentury * 100;
                } else {
                    iWeekYear += (iCurrentCentury - 1) * 100;
                }
            }
            return {
                length: sPart.length,
                valid: oParseHelper.checkValid(oPart.type, sPart === '', oFormat),
                year: iYear,
                weekYear: iWeekYear
            };
        }
    },
    'M': {
        name: 'month',
        format: function (oField, oDate, bUTC, oFormat) {
            var iMonth = bUTC ? oDate.getUTCMonth() : oDate.getMonth();
            if (oField.digits == 3) {
                return oFormat.aMonthsAbbrev[iMonth];
            } else if (oField.digits == 4) {
                return oFormat.aMonthsWide[iMonth];
            } else if (oField.digits > 4) {
                return oFormat.aMonthsNarrow[iMonth];
            } else {
                return String(iMonth + 1).padStart(oField.digits, '0');
            }
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var aMonthsVariants = [
                oFormat.aMonthsWide,
                oFormat.aMonthsWideSt,
                oFormat.aMonthsAbbrev,
                oFormat.aMonthsAbbrevSt,
                oFormat.aMonthsNarrow,
                oFormat.aMonthsNarrowSt
            ];
            var bValid;
            var iMonth;
            var sPart;
            if (oPart.digits < 3) {
                sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
                bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
                iMonth = parseInt(sPart) - 1;
                if (oConfig.strict && (iMonth > 11 || iMonth < 0)) {
                    bValid = false;
                }
            } else {
                for (var i = 0; i < aMonthsVariants.length; i++) {
                    var aVariants = aMonthsVariants[i];
                    var oFound = oParseHelper.findEntry(sValue, aVariants);
                    if (oFound.index !== -1) {
                        return {
                            month: oFound.index,
                            length: oFound.value.length
                        };
                    }
                }
                bValid = oParseHelper.checkValid(oPart.type, true, oFormat);
            }
            return {
                month: iMonth,
                length: sPart ? sPart.length : 0,
                valid: bValid
            };
        }
    },
    'L': {
        name: 'monthStandalone',
        format: function (oField, oDate, bUTC, oFormat) {
            var iMonth = bUTC ? oDate.getUTCMonth() : oDate.getMonth();
            if (oField.digits == 3) {
                return oFormat.aMonthsAbbrevSt[iMonth];
            } else if (oField.digits == 4) {
                return oFormat.aMonthsWideSt[iMonth];
            } else if (oField.digits > 4) {
                return oFormat.aMonthsNarrowSt[iMonth];
            } else {
                return String(iMonth + 1).padStart(oField.digits, '0');
            }
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var aMonthsVariants = [
                oFormat.aMonthsWide,
                oFormat.aMonthsWideSt,
                oFormat.aMonthsAbbrev,
                oFormat.aMonthsAbbrevSt,
                oFormat.aMonthsNarrow,
                oFormat.aMonthsNarrowSt
            ];
            var bValid;
            var iMonth;
            var sPart;
            if (oPart.digits < 3) {
                sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
                bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
                iMonth = parseInt(sPart) - 1;
                if (oConfig.strict && (iMonth > 11 || iMonth < 0)) {
                    bValid = false;
                }
            } else {
                for (var i = 0; i < aMonthsVariants.length; i++) {
                    var aVariants = aMonthsVariants[i];
                    var oFound = oParseHelper.findEntry(sValue, aVariants);
                    if (oFound.index !== -1) {
                        return {
                            month: oFound.index,
                            length: oFound.value.length
                        };
                    }
                }
                bValid = oParseHelper.checkValid(oPart.type, true, oFormat);
            }
            return {
                month: iMonth,
                length: sPart ? sPart.length : 0,
                valid: bValid
            };
        }
    },
    'w': {
        name: 'weekInYear',
        format: function (oField, oDate, bUTC, oFormat) {
            var oWeek = bUTC ? oDate.getUTCWeek() : oDate.getWeek();
            var iWeek = oWeek.week;
            var sWeek = String(iWeek + 1);
            if (oField.digits < 3) {
                sWeek = sWeek.padStart(oField.digits, '0');
            } else {
                sWeek = oFormat.oLocaleData.getCalendarWeek(oField.digits === 3 ? 'narrow' : 'wide', sWeek.padStart(2, '0'));
            }
            return sWeek;
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bValid;
            var sPart;
            var iWeek;
            var iLength = 0;
            if (oPart.digits < 3) {
                sPart = oParseHelper.findNumbers(sValue, 2);
                iLength = sPart.length;
                iWeek = parseInt(sPart) - 1;
                bValid = oParseHelper.checkValid(oPart.type, !sPart, oFormat);
            } else {
                sPart = oFormat.oLocaleData.getCalendarWeek(oPart.digits === 3 ? 'narrow' : 'wide');
                sPart = sPart.replace('{0}', '[0-9]+');
                var rWeekNumber = new RegExp(sPart), oResult = rWeekNumber.exec(sValue);
                if (oResult) {
                    iLength = oResult[0].length;
                    iWeek = parseInt(oResult[0]) - 1;
                } else {
                    bValid = oParseHelper.checkValid(oPart.type, true, oFormat);
                }
            }
            return {
                length: iLength,
                valid: bValid,
                week: iWeek
            };
        }
    },
    'W': {
        name: 'weekInMonth',
        format: function (oField, oDate, bUTC, oFormat) {
            return '';
        },
        parse: function () {
            return {};
        }
    },
    'D': {
        name: 'dayInYear',
        format: function (oField, oDate, bUTC, oFormat) {
        },
        parse: function () {
            return {};
        }
    },
    'd': {
        name: 'day',
        format: function (oField, oDate, bUTC, oFormat) {
            var iDate = bUTC ? oDate.getUTCDate() : oDate.getDate();
            return String(iDate).padStart(oField.digits, '0');
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
            var bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
            var iDay = parseInt(sPart);
            if (oConfig.strict && (iDay > 31 || iDay < 1)) {
                bValid = false;
            }
            return {
                day: iDay,
                length: sPart.length,
                valid: bValid
            };
        }
    },
    'Q': {
        name: 'quarter',
        format: function (oField, oDate, bUTC, oFormat) {
            var iQuarter = bUTC ? oDate.getUTCQuarter() : oDate.getQuarter();
            if (oField.digits == 3) {
                return oFormat.aQuartersAbbrev[iQuarter];
            } else if (oField.digits == 4) {
                return oFormat.aQuartersWide[iQuarter];
            } else if (oField.digits > 4) {
                return oFormat.aQuartersNarrow[iQuarter];
            } else {
                return String(iQuarter + 1).padStart(oField.digits, '0');
            }
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bValid;
            var iQuarter;
            var sPart;
            var aQuartersVariants = [
                oFormat.aQuartersWide,
                oFormat.aQuartersWideSt,
                oFormat.aQuartersAbbrev,
                oFormat.aQuartersAbbrevSt,
                oFormat.aQuartersNarrow,
                oFormat.aQuartersNarrowSt
            ];
            if (oPart.digits < 3) {
                sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
                bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
                iQuarter = parseInt(sPart) - 1;
                if (oConfig.strict && iQuarter > 3) {
                    bValid = false;
                }
            } else {
                for (var i = 0; i < aQuartersVariants.length; i++) {
                    var aVariants = aQuartersVariants[i];
                    var oFound = oParseHelper.findEntry(sValue, aVariants);
                    if (oFound.index !== -1) {
                        return {
                            quarter: oFound.index,
                            length: oFound.value.length
                        };
                    }
                }
                bValid = oParseHelper.checkValid(oPart.type, true, oFormat);
            }
            return {
                length: sPart ? sPart.length : 0,
                quarter: iQuarter,
                valid: bValid
            };
        }
    },
    'q': {
        name: 'quarterStandalone',
        format: function (oField, oDate, bUTC, oFormat) {
            var iQuarter = bUTC ? oDate.getUTCQuarter() : oDate.getQuarter();
            if (oField.digits == 3) {
                return oFormat.aQuartersAbbrevSt[iQuarter];
            } else if (oField.digits == 4) {
                return oFormat.aQuartersWideSt[iQuarter];
            } else if (oField.digits > 4) {
                return oFormat.aQuartersNarrowSt[iQuarter];
            } else {
                return String(iQuarter + 1).padStart(oField.digits, '0');
            }
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bValid;
            var iQuarter;
            var sPart;
            var aQuartersVariants = [
                oFormat.aQuartersWide,
                oFormat.aQuartersWideSt,
                oFormat.aQuartersAbbrev,
                oFormat.aQuartersAbbrevSt,
                oFormat.aQuartersNarrow,
                oFormat.aQuartersNarrowSt
            ];
            if (oPart.digits < 3) {
                sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
                bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
                iQuarter = parseInt(sPart) - 1;
                if (oConfig.strict && iQuarter > 3) {
                    bValid = false;
                }
            } else {
                for (var i = 0; i < aQuartersVariants.length; i++) {
                    var aVariants = aQuartersVariants[i];
                    var oFound = oParseHelper.findEntry(sValue, aVariants);
                    if (oFound.index !== -1) {
                        return {
                            quarter: oFound.index,
                            length: oFound.value.length
                        };
                    }
                }
                bValid = oParseHelper.checkValid(oPart.type, true, oFormat);
            }
            return {
                length: sPart ? sPart.length : 0,
                quarter: iQuarter,
                valid: bValid
            };
        }
    },
    'F': {
        name: 'dayOfWeekInMonth',
        format: function (oField, oDate, bUTC, oFormat) {
            return '';
        },
        parse: function () {
            return {};
        }
    },
    'E': {
        name: 'dayNameInWeek',
        format: function (oField, oDate, bUTC, oFormat) {
            var iDay = bUTC ? oDate.getUTCDay() : oDate.getDay();
            if (oField.digits < 4) {
                return oFormat.aDaysAbbrev[iDay];
            } else if (oField.digits == 4) {
                return oFormat.aDaysWide[iDay];
            } else if (oField.digits == 5) {
                return oFormat.aDaysNarrow[iDay];
            } else {
                return oFormat.aDaysShort[iDay];
            }
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var aDaysVariants = [
                oFormat.aDaysWide,
                oFormat.aDaysWideSt,
                oFormat.aDaysAbbrev,
                oFormat.aDaysAbbrevSt,
                oFormat.aDaysShort,
                oFormat.aDaysShortSt,
                oFormat.aDaysNarrow,
                oFormat.aDaysNarrowSt
            ];
            for (var i = 0; i < aDaysVariants.length; i++) {
                var aVariants = aDaysVariants[i];
                var oFound = oParseHelper.findEntry(sValue, aVariants);
                if (oFound.index !== -1) {
                    return {
                        dayOfWeek: oFound.index,
                        length: oFound.value.length
                    };
                }
            }
        }
    },
    'c': {
        name: 'dayNameInWeekStandalone',
        format: function (oField, oDate, bUTC, oFormat) {
            var iDay = bUTC ? oDate.getUTCDay() : oDate.getDay();
            if (oField.digits < 4) {
                return oFormat.aDaysAbbrevSt[iDay];
            } else if (oField.digits == 4) {
                return oFormat.aDaysWideSt[iDay];
            } else if (oField.digits == 5) {
                return oFormat.aDaysNarrowSt[iDay];
            } else {
                return oFormat.aDaysShortSt[iDay];
            }
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var aDaysVariants = [
                oFormat.aDaysWide,
                oFormat.aDaysWideSt,
                oFormat.aDaysAbbrev,
                oFormat.aDaysAbbrevSt,
                oFormat.aDaysShort,
                oFormat.aDaysShortSt,
                oFormat.aDaysNarrow,
                oFormat.aDaysNarrowSt
            ];
            for (var i = 0; i < aDaysVariants.length; i++) {
                var aVariants = aDaysVariants[i];
                var oFound = oParseHelper.findEntry(sValue, aVariants);
                if (oFound.index !== -1) {
                    return {
                        day: oFound.index,
                        length: oFound.value.length
                    };
                }
            }
        }
    },
    'u': {
        name: 'dayNumberOfWeek',
        format: function (oField, oDate, bUTC, oFormat) {
            var iDay = bUTC ? oDate.getUTCDay() : oDate.getDay();
            return oFormat._adaptDayOfWeek(iDay);
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var sPart = oParseHelper.findNumbers(sValue, oPart.digits);
            return {
                dayNumberOfWeek: parseInt(sPart),
                length: sPart.length
            };
        }
    },
    'a': {
        name: 'amPmMarker',
        format: function (oField, oDate, bUTC, oFormat) {
            var iDayPeriod = bUTC ? oDate.getUTCDayPeriod() : oDate.getDayPeriod();
            return oFormat.aDayPeriods[iDayPeriod];
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bPM;
            var iLength;
            var sAM = oFormat.aDayPeriods[0], sPM = oFormat.aDayPeriods[1];
            var rAMPM = /[aApP](?:\.)?[mM](?:\.)?/;
            var aMatch = sValue.match(rAMPM);
            var bVariant = aMatch && aMatch.index === 0;
            if (bVariant) {
                sValue = aMatch[0].replace(/\./g, '').toLowerCase() + sValue.substring(aMatch[0].length);
                sAM = sAM.toLowerCase();
                sPM = sPM.toLowerCase();
            }
            if (sValue.indexOf(sAM) === 0) {
                bPM = false;
                iLength = bVariant ? aMatch[0].length : sAM.length;
            } else if (sValue.indexOf(sPM) === 0) {
                bPM = true;
                iLength = bVariant ? aMatch[0].length : sPM.length;
            }
            return {
                pm: bPM,
                length: iLength
            };
        }
    },
    'H': {
        name: 'hour0_23',
        format: function (oField, oDate, bUTC, oFormat) {
            var iHours = bUTC ? oDate.getUTCHours() : oDate.getHours();
            return String(iHours).padStart(oField.digits, '0');
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bValid;
            var sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
            var iHours = parseInt(sPart);
            bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
            if (oConfig.strict && iHours > 23) {
                bValid = false;
            }
            return {
                hour: iHours,
                length: sPart.length,
                valid: bValid
            };
        }
    },
    'k': {
        name: 'hour1_24',
        format: function (oField, oDate, bUTC, oFormat) {
            var iHours = bUTC ? oDate.getUTCHours() : oDate.getHours();
            var sHours = iHours === 0 ? '24' : String(iHours);
            return sHours.padStart(oField.digits, '0');
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bValid;
            var sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
            var iHours = parseInt(sPart);
            bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
            if (iHours == 24) {
                iHours = 0;
            }
            if (oConfig.strict && iHours > 23) {
                bValid = false;
            }
            return {
                hour: iHours,
                length: sPart.length,
                valid: bValid
            };
        }
    },
    'K': {
        name: 'hour0_11',
        format: function (oField, oDate, bUTC, oFormat) {
            var iHours = bUTC ? oDate.getUTCHours() : oDate.getHours();
            var sHours = String(iHours > 11 ? iHours - 12 : iHours);
            return sHours.padStart(oField.digits, '0');
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bValid;
            var sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
            var iHours = parseInt(sPart);
            bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
            if (oConfig.strict && iHours > 11) {
                bValid = false;
            }
            return {
                hour: iHours,
                length: sPart.length,
                valid: bValid
            };
        }
    },
    'h': {
        name: 'hour1_12',
        format: function (oField, oDate, bUTC, oFormat) {
            var iHours = bUTC ? oDate.getUTCHours() : oDate.getHours();
            var sHours;
            if (iHours > 12) {
                sHours = String(iHours - 12);
            } else if (iHours == 0) {
                sHours = '12';
            } else {
                sHours = String(iHours);
            }
            return sHours.padStart(oField.digits, '0');
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bPM = oConfig.dateValue.pm;
            var sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
            var iHours = parseInt(sPart);
            var bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
            if (iHours == 12) {
                iHours = 0;
                bPM = bPM === undefined ? true : bPM;
            }
            if (oConfig.strict && iHours > 11) {
                bValid = false;
            }
            return {
                hour: iHours,
                length: sPart.length,
                pm: bPM,
                valid: bValid
            };
        }
    },
    'm': {
        name: 'minute',
        format: function (oField, oDate, bUTC, oFormat) {
            var iMinutes = bUTC ? oDate.getUTCMinutes() : oDate.getMinutes();
            return String(iMinutes).padStart(oField.digits, '0');
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bValid;
            var sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
            var iMinutes = parseInt(sPart);
            bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
            if (oConfig.strict && iMinutes > 59) {
                bValid = false;
            }
            return {
                length: sPart.length,
                minute: iMinutes,
                valid: bValid
            };
        }
    },
    's': {
        name: 'second',
        format: function (oField, oDate, bUTC, oFormat) {
            var iSeconds = bUTC ? oDate.getUTCSeconds() : oDate.getSeconds();
            return String(iSeconds).padStart(oField.digits, '0');
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var bValid;
            var sPart = oParseHelper.findNumbers(sValue, Math.max(oPart.digits, 2));
            var iSeconds = parseInt(sPart);
            bValid = oParseHelper.checkValid(oPart.type, sPart === '', oFormat);
            if (oConfig.strict && iSeconds > 59) {
                bValid = false;
            }
            return {
                length: sPart.length,
                second: iSeconds,
                valid: bValid
            };
        }
    },
    'S': {
        name: 'fractionalsecond',
        format: function (oField, oDate, bUTC, oFormat) {
            var iMilliseconds = bUTC ? oDate.getUTCMilliseconds() : oDate.getMilliseconds();
            var sMilliseconds = String(iMilliseconds);
            var sFractionalseconds = sMilliseconds.padStart(3, '0');
            sFractionalseconds = sFractionalseconds.substr(0, oField.digits);
            sFractionalseconds = sFractionalseconds.padEnd(oField.digits, '0');
            return sFractionalseconds;
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var sPart = oParseHelper.findNumbers(sValue, oPart.digits);
            var iLength = sPart.length;
            sPart = sPart.substr(0, 3);
            sPart = sPart.padEnd(3, '0');
            var iMilliseconds = parseInt(sPart);
            return {
                length: iLength,
                millisecond: iMilliseconds
            };
        }
    },
    'z': {
        name: 'timezoneGeneral',
        format: function (oField, oDate, bUTC, oFormat) {
            if (oField.digits > 3 && oDate.getTimezoneLong()) {
                return oDate.getTimezoneLong();
            } else if (oDate.getTimezoneShort()) {
                return oDate.getTimezoneShort();
            }
            var sTimeZone = 'GMT';
            var iTZOffset = Math.abs(oDate.getTimezoneOffset());
            var bPositiveOffset = oDate.getTimezoneOffset() > 0;
            var iHourOffset = Math.floor(iTZOffset / 60);
            var iMinuteOffset = iTZOffset % 60;
            if (!bUTC && iTZOffset != 0) {
                sTimeZone += bPositiveOffset ? '-' : '+';
                sTimeZone += String(iHourOffset).padStart(2, '0');
                sTimeZone += ':';
                sTimeZone += String(iMinuteOffset).padStart(2, '0');
            } else {
                sTimeZone += 'Z';
            }
            return sTimeZone;
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            var iLength = 0;
            var iTZDiff;
            var oTZ = sValue.substring(0, 3);
            if (oTZ === 'GMT' || oTZ === 'UTC') {
                iLength = 3;
            } else if (sValue.substring(0, 2) === 'UT') {
                iLength = 2;
            } else if (sValue.charAt(0) == 'Z') {
                iLength = 1;
                iTZDiff = 0;
            } else {
                return { error: 'cannot be parsed correcly by sap.ui.core.format.DateFormat: The given timezone is not supported!' };
            }
            if (sValue.charAt(0) != 'Z') {
                var oParsedTZ = oParseHelper.parseTZ(sValue.substr(iLength), true);
                iLength += oParsedTZ.length;
                iTZDiff = oParsedTZ.tzDiff;
            }
            return {
                length: iLength,
                tzDiff: iTZDiff
            };
        }
    },
    'Z': {
        name: 'timezoneRFC822',
        format: function (oField, oDate, bUTC, oFormat) {
            var iTZOffset = Math.abs(oDate.getTimezoneOffset());
            var bPositiveOffset = oDate.getTimezoneOffset() > 0;
            var iHourOffset = Math.floor(iTZOffset / 60);
            var iMinuteOffset = iTZOffset % 60;
            var sTimeZone = '';
            if (!bUTC && iTZOffset != 0) {
                sTimeZone += bPositiveOffset ? '-' : '+';
                sTimeZone += String(iHourOffset).padStart(2, '0');
                sTimeZone += String(iMinuteOffset).padStart(2, '0');
            }
            return sTimeZone;
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            return oParseHelper.parseTZ(sValue, false);
        }
    },
    'X': {
        name: 'timezoneISO8601',
        format: function (oField, oDate, bUTC, oFormat) {
            var iTZOffset = Math.abs(oDate.getTimezoneOffset());
            var bPositiveOffset = oDate.getTimezoneOffset() > 0;
            var iHourOffset = Math.floor(iTZOffset / 60);
            var iMinuteOffset = iTZOffset % 60;
            var sTimeZone = '';
            if (!bUTC && iTZOffset != 0) {
                sTimeZone += bPositiveOffset ? '-' : '+';
                sTimeZone += String(iHourOffset).padStart(2, '0');
                sTimeZone += ':';
                sTimeZone += String(iMinuteOffset).padStart(2, '0');
            } else {
                sTimeZone += 'Z';
            }
            return sTimeZone;
        },
        parse: function (sValue, oPart, oFormat, oConfig) {
            if (sValue.charAt(0) == 'Z') {
                return {
                    length: 1,
                    tzDiff: 0
                };
            } else {
                return oParseHelper.parseTZ(sValue, true);
            }
        }
    }
};
DateFormat.prototype._format = function (oJSDate, bUTC) {
    if (this.oFormatOptions.relative) {
        var sRes = this.formatRelative(oJSDate, bUTC, this.oFormatOptions.relativeRange);
        if (sRes) {
            return sRes;
        }
    }
    var sCalendarType = this.oFormatOptions.calendarType;
    var oDate = UniversalDate.getInstance(oJSDate, sCalendarType);
    var aBuffer = [], oPart, sResult, sSymbol;
    for (var i = 0; i < this.aFormatArray.length; i++) {
        oPart = this.aFormatArray[i];
        sSymbol = oPart.symbol || '';
        aBuffer.push(this.oSymbols[sSymbol].format(oPart, oDate, bUTC, this));
    }
    sResult = aBuffer.join('');
    if (sap.ui.getWCCore().getConfiguration().getOriginInfo()) {
        sResult = new String(sResult);
        sResult.originInfo = {
            source: 'Common Locale Data Repository',
            locale: this.oLocale.toString(),
            style: this.oFormatOptions.style,
            pattern: this.oFormatOptions.pattern
        };
    }
    return sResult;
};
DateFormat.prototype.format = function (vJSDate, bUTC) {
    if (bUTC === undefined) {
        bUTC = this.oFormatOptions.UTC;
    }
    if (Array.isArray(vJSDate)) {
        if (!this.oFormatOptions.interval) {
            Log.error('Non-interval DateFormat can\'t format more than one date instance.');
            return '';
        }
        if (vJSDate.length !== 2) {
            Log.error('Interval DateFormat can only format with 2 date instances but ' + vJSDate.length + ' is given.');
            return '';
        }
        var bValid = vJSDate.every(function (oJSDate) {
            return oJSDate && !isNaN(oJSDate.getTime());
        });
        if (!bValid) {
            Log.error('At least one date instance which is passed to the interval DateFormat isn\'t valid.');
            return '';
        }
        return this._formatInterval(vJSDate, bUTC);
    } else {
        if (!vJSDate || isNaN(vJSDate.getTime())) {
            Log.error('The given date instance isn\'t valid.');
            return '';
        }
        if (this.oFormatOptions.interval) {
            Log.error('Interval DateFormat expects an array with two dates for the first argument but only one date is given.');
            return '';
        }
        return this._format(vJSDate, bUTC);
    }
};
DateFormat.prototype._formatInterval = function (aJSDates, bUTC) {
    var sCalendarType = this.oFormatOptions.calendarType;
    var oFromDate = UniversalDate.getInstance(aJSDates[0], sCalendarType);
    var oToDate = UniversalDate.getInstance(aJSDates[1], sCalendarType);
    var oDate;
    var oPart;
    var sSymbol;
    var aBuffer = [];
    var sPattern;
    var oDiffField = this._getGreatestDiffField([
        oFromDate,
        oToDate
    ], bUTC);
    if (!oDiffField) {
        return this._format(aJSDates[0], bUTC);
    }
    if (this.oFormatOptions.format) {
        sPattern = this.oLocaleData.getCustomIntervalPattern(this.oFormatOptions.format, oDiffField, sCalendarType);
    } else {
        sPattern = this.oLocaleData.getCombinedIntervalPattern(this.oFormatOptions.pattern, sCalendarType);
    }
    this.aFormatArray = this.parseCldrDatePattern(sPattern);
    oDate = oFromDate;
    for (var i = 0; i < this.aFormatArray.length; i++) {
        oPart = this.aFormatArray[i];
        sSymbol = oPart.symbol || '';
        if (oPart.repeat) {
            oDate = oToDate;
        }
        aBuffer.push(this.oSymbols[sSymbol].format(oPart, oDate, bUTC, this));
    }
    return aBuffer.join('');
};
var mFieldToGroup = {
    FullYear: 'Year',
    Quarter: 'Quarter',
    Month: 'Month',
    Week: 'Week',
    Date: 'Day',
    DayPeriod: 'DayPeriod',
    Hours: 'Hour',
    Minutes: 'Minute',
    Seconds: 'Second'
};
DateFormat.prototype._getGreatestDiffField = function (aDates, bUTC) {
    var bDiffFound = false, mDiff = {};
    this.aIntervalCompareFields.forEach(function (sField) {
        var sGetterPrefix = 'get' + (bUTC ? 'UTC' : ''), sMethodName = sGetterPrefix + sField, sFieldGroup = mFieldToGroup[sField], vFromValue = aDates[0][sMethodName].apply(aDates[0]), vToValue = aDates[1][sMethodName].apply(aDates[1]);
        if (!fnEqual(vFromValue, vToValue)) {
            bDiffFound = true;
            mDiff[sFieldGroup] = true;
        }
    });
    if (bDiffFound) {
        return mDiff;
    }
    return null;
};
DateFormat.prototype._parse = function (sValue, aFormatArray, bUTC, bStrict) {
    var iIndex = 0, oPart, sSubValue, oResult;
    var oDateValue = { valid: true };
    var oParseConf = {
        formatArray: aFormatArray,
        dateValue: oDateValue,
        strict: bStrict
    };
    for (var i = 0; i < aFormatArray.length; i++) {
        sSubValue = sValue.substr(iIndex);
        oPart = aFormatArray[i];
        oParseConf.index = i;
        oResult = this.oSymbols[oPart.symbol || ''].parse(sSubValue, oPart, this, oParseConf) || {};
        oDateValue = jQuery.extend(oDateValue, oResult);
        if (oResult.valid === false) {
            break;
        }
        iIndex += oResult.length || 0;
    }
    oDateValue.index = iIndex;
    if (oDateValue.pm) {
        oDateValue.hour += 12;
    }
    if (oDateValue.dayNumberOfWeek === undefined && oDateValue.dayOfWeek !== undefined) {
        oDateValue.dayNumberOfWeek = this._adaptDayOfWeek(oDateValue.dayOfWeek);
    }
    if (oDateValue.quarter !== undefined && oDateValue.month === undefined && oDateValue.day === undefined) {
        oDateValue.month = 3 * oDateValue.quarter;
        oDateValue.day = 1;
    }
    return oDateValue;
};
DateFormat.prototype._parseInterval = function (sValue, sCalendarType, bUTC, bStrict) {
    var aDateValues, iRepeat, oDateValue;
    this.intervalPatterns.some(function (sPattern) {
        var aFormatArray = this.parseCldrDatePattern(sPattern);
        iRepeat = undefined;
        for (var i = 0; i < aFormatArray.length; i++) {
            if (aFormatArray[i].repeat) {
                iRepeat = i;
                break;
            }
        }
        if (iRepeat === undefined) {
            oDateValue = this._parse(sValue, aFormatArray, bUTC, bStrict);
            if (oDateValue.index === 0 || oDateValue.index < sValue.length) {
                oDateValue.valid = false;
            }
            if (oDateValue.valid === false) {
                return;
            }
            aDateValues = [
                oDateValue,
                oDateValue
            ];
            return true;
        } else {
            aDateValues = [];
            oDateValue = this._parse(sValue, aFormatArray.slice(0, iRepeat), bUTC, bStrict);
            if (oDateValue.valid === false) {
                return;
            }
            aDateValues.push(oDateValue);
            var iLength = oDateValue.index;
            oDateValue = this._parse(sValue.substring(iLength), aFormatArray.slice(iRepeat), bUTC, bStrict);
            if (oDateValue.index === 0 || oDateValue.index + iLength < sValue.length) {
                oDateValue.valid = false;
            }
            if (oDateValue.valid === false) {
                return;
            }
            aDateValues.push(oDateValue);
            return true;
        }
    }.bind(this));
    return aDateValues;
};
var fnCreateDate = function (oDateValue, sCalendarType, bUTC, bStrict) {
    var oDate, iYear = typeof oDateValue.year === 'number' ? oDateValue.year : 1970;
    if (oDateValue.valid) {
        if (bUTC || oDateValue.tzDiff !== undefined) {
            oDate = UniversalDate.getInstance(new Date(0), sCalendarType);
            oDate.setUTCEra(oDateValue.era || UniversalDate.getCurrentEra(sCalendarType));
            oDate.setUTCFullYear(iYear);
            oDate.setUTCMonth(oDateValue.month || 0);
            oDate.setUTCDate(oDateValue.day || 1);
            oDate.setUTCHours(oDateValue.hour || 0);
            oDate.setUTCMinutes(oDateValue.minute || 0);
            oDate.setUTCSeconds(oDateValue.second || 0);
            oDate.setUTCMilliseconds(oDateValue.millisecond || 0);
            if (bStrict && (oDateValue.day || 1) !== oDate.getUTCDate()) {
                oDateValue.valid = false;
                oDate = undefined;
            } else {
                if (oDateValue.tzDiff) {
                    oDate.setUTCMinutes((oDateValue.minute || 0) + oDateValue.tzDiff);
                }
                if (oDateValue.week !== undefined && (oDateValue.month === undefined || oDateValue.day === undefined)) {
                    oDate.setUTCWeek({
                        year: oDateValue.weekYear || oDateValue.year,
                        week: oDateValue.week
                    });
                    if (oDateValue.dayNumberOfWeek !== undefined) {
                        oDate.setUTCDate(oDate.getUTCDate() + oDateValue.dayNumberOfWeek - 1);
                    }
                }
            }
        } else {
            oDate = UniversalDate.getInstance(new Date(1970, 0, 1, 0, 0, 0), sCalendarType);
            oDate.setEra(oDateValue.era || UniversalDate.getCurrentEra(sCalendarType));
            oDate.setFullYear(iYear);
            oDate.setMonth(oDateValue.month || 0);
            oDate.setDate(oDateValue.day || 1);
            oDate.setHours(oDateValue.hour || 0);
            oDate.setMinutes(oDateValue.minute || 0);
            oDate.setSeconds(oDateValue.second || 0);
            oDate.setMilliseconds(oDateValue.millisecond || 0);
            if (bStrict && (oDateValue.day || 1) !== oDate.getDate()) {
                oDateValue.valid = false;
                oDate = undefined;
            } else if (oDateValue.week !== undefined && (oDateValue.month === undefined || oDateValue.day === undefined)) {
                oDate.setWeek({
                    year: oDateValue.weekYear || oDateValue.year,
                    week: oDateValue.week
                });
                if (oDateValue.dayNumberOfWeek !== undefined) {
                    oDate.setDate(oDate.getDate() + oDateValue.dayNumberOfWeek - 1);
                }
            }
        }
        if (oDateValue.valid) {
            oDate = oDate.getJSDate();
            return oDate;
        }
    }
    return null;
};
function mergeWithoutOverwrite(object1, object2) {
    if (object1 === object2) {
        return object1;
    }
    var oMergedObject = {};
    Object.keys(object1).forEach(function (sKey) {
        oMergedObject[sKey] = object1[sKey];
    });
    Object.keys(object2).forEach(function (sKey) {
        if (!oMergedObject.hasOwnProperty(sKey)) {
            oMergedObject[sKey] = object2[sKey];
        }
    });
    return oMergedObject;
}
DateFormat.prototype.parse = function (sValue, bUTC, bStrict) {
    sValue = jQuery.trim(sValue);
    var oDateValue;
    var sCalendarType = this.oFormatOptions.calendarType;
    if (bUTC === undefined) {
        bUTC = this.oFormatOptions.UTC;
    }
    if (bStrict === undefined) {
        bStrict = this.oFormatOptions.strictParsing;
    }
    if (!this.oFormatOptions.interval) {
        var oJSDate = this.parseRelative(sValue, bUTC);
        if (oJSDate) {
            return oJSDate;
        }
        oDateValue = this._parse(sValue, this.aFormatArray, bUTC, bStrict);
        if (oDateValue.index === 0 || oDateValue.index < sValue.length) {
            oDateValue.valid = false;
        }
        oJSDate = fnCreateDate(oDateValue, sCalendarType, bUTC, bStrict);
        if (oJSDate) {
            return oJSDate;
        }
    } else {
        var aDateValues = this._parseInterval(sValue, sCalendarType, bUTC, bStrict);
        var oJSDate1, oJSDate2;
        if (aDateValues && aDateValues.length == 2) {
            var oDateValue1 = mergeWithoutOverwrite(aDateValues[0], aDateValues[1]);
            var oDateValue2 = mergeWithoutOverwrite(aDateValues[1], aDateValues[0]);
            oJSDate1 = fnCreateDate(oDateValue1, sCalendarType, bUTC, bStrict);
            oJSDate2 = fnCreateDate(oDateValue2, sCalendarType, bUTC, bStrict);
            if (oJSDate1 && oJSDate2) {
                return [
                    oJSDate1,
                    oJSDate2
                ];
            }
        }
    }
    if (!this.bIsFallback) {
        var vDate;
        this.aFallbackFormats.every(function (oFallbackFormat) {
            vDate = oFallbackFormat.parse(sValue, bUTC, bStrict);
            if (Array.isArray(vDate)) {
                return !(vDate[0] && vDate[1]);
            } else {
                return !vDate;
            }
        });
        return vDate;
    }
    if (!this.oFormatOptions.interval) {
        return null;
    } else {
        return [
            null,
            null
        ];
    }
};
DateFormat.prototype.parseCldrDatePattern = function (sPattern) {
    if (mCldrDatePattern[sPattern]) {
        return mCldrDatePattern[sPattern];
    }
    var aFormatArray = [], i, bQuoted = false, oCurrentObject = null, sState = '', sNewState = '', mAppeared = {}, bIntervalStartFound = false;
    for (i = 0; i < sPattern.length; i++) {
        var sCurChar = sPattern.charAt(i), sNextChar, sPrevChar, sPrevPrevChar;
        if (bQuoted) {
            if (sCurChar == '\'') {
                sPrevChar = sPattern.charAt(i - 1);
                sPrevPrevChar = sPattern.charAt(i - 2);
                sNextChar = sPattern.charAt(i + 1);
                if (sPrevChar == '\'' && sPrevPrevChar != '\'') {
                    bQuoted = false;
                } else if (sNextChar == '\'') {
                    i += 1;
                } else {
                    bQuoted = false;
                    continue;
                }
            }
            if (sState == 'text') {
                oCurrentObject.value += sCurChar;
            } else {
                oCurrentObject = {
                    type: 'text',
                    value: sCurChar
                };
                aFormatArray.push(oCurrentObject);
                sState = 'text';
            }
        } else {
            if (sCurChar == '\'') {
                bQuoted = true;
            } else if (this.oSymbols[sCurChar]) {
                sNewState = this.oSymbols[sCurChar].name;
                if (sState == sNewState) {
                    oCurrentObject.digits++;
                } else {
                    oCurrentObject = {
                        type: sNewState,
                        symbol: sCurChar,
                        digits: 1
                    };
                    aFormatArray.push(oCurrentObject);
                    sState = sNewState;
                    if (!bIntervalStartFound) {
                        if (mAppeared[sNewState]) {
                            oCurrentObject.repeat = true;
                            bIntervalStartFound = true;
                        } else {
                            mAppeared[sNewState] = true;
                        }
                    }
                }
            } else {
                if (sState == 'text') {
                    oCurrentObject.value += sCurChar;
                } else {
                    oCurrentObject = {
                        type: 'text',
                        value: sCurChar
                    };
                    aFormatArray.push(oCurrentObject);
                    sState = 'text';
                }
            }
        }
    }
    mCldrDatePattern[sPattern] = aFormatArray;
    return aFormatArray;
};
DateFormat.prototype.parseRelative = function (sValue, bUTC) {
    var aPatterns, oEntry, rPattern, oResult, iValue;
    if (!sValue) {
        return null;
    }
    aPatterns = this.oLocaleData.getRelativePatterns(this.aRelativeParseScales, this.oFormatOptions.relativeStyle);
    for (var i = 0; i < aPatterns.length; i++) {
        oEntry = aPatterns[i];
        rPattern = new RegExp('^\\s*' + oEntry.pattern.replace(/\{0\}/, '(\\d+)') + '\\s*$', 'i');
        oResult = rPattern.exec(sValue);
        if (oResult) {
            if (oEntry.value !== undefined) {
                return computeRelativeDate(oEntry.value, oEntry.scale);
            } else {
                iValue = parseInt(oResult[1]);
                return computeRelativeDate(iValue * oEntry.sign, oEntry.scale);
            }
        }
    }
    function computeRelativeDate(iDiff, sScale) {
        var iToday, oToday = new Date(), oJSDate;
        if (bUTC) {
            iToday = oToday.getTime();
        } else {
            iToday = Date.UTC(oToday.getFullYear(), oToday.getMonth(), oToday.getDate(), oToday.getHours(), oToday.getMinutes(), oToday.getSeconds(), oToday.getMilliseconds());
        }
        oJSDate = new Date(iToday);
        switch (sScale) {
        case 'second':
            oJSDate.setUTCSeconds(oJSDate.getUTCSeconds() + iDiff);
            break;
        case 'minute':
            oJSDate.setUTCMinutes(oJSDate.getUTCMinutes() + iDiff);
            break;
        case 'hour':
            oJSDate.setUTCHours(oJSDate.getUTCHours() + iDiff);
            break;
        case 'day':
            oJSDate.setUTCDate(oJSDate.getUTCDate() + iDiff);
            break;
        case 'week':
            oJSDate.setUTCDate(oJSDate.getUTCDate() + iDiff * 7);
            break;
        case 'month':
            oJSDate.setUTCMonth(oJSDate.getUTCMonth() + iDiff);
            break;
        case 'quarter':
            oJSDate.setUTCMonth(oJSDate.getUTCMonth() + iDiff * 3);
            break;
        case 'year':
            oJSDate.setUTCFullYear(oJSDate.getUTCFullYear() + iDiff);
            break;
        }
        if (bUTC) {
            return oJSDate;
        } else {
            return new Date(oJSDate.getUTCFullYear(), oJSDate.getUTCMonth(), oJSDate.getUTCDate(), oJSDate.getUTCHours(), oJSDate.getUTCMinutes(), oJSDate.getUTCSeconds(), oJSDate.getUTCMilliseconds());
        }
    }
};
DateFormat.prototype.formatRelative = function (oJSDate, bUTC, aRange) {
    var oToday = new Date(), oDateUTC, sScale = this.oFormatOptions.relativeScale || 'day', iDiff, sPattern, iDiffSeconds;
    iDiffSeconds = (oJSDate.getTime() - oToday.getTime()) / 1000;
    if (this.oFormatOptions.relativeScale == 'auto') {
        sScale = this._getScale(iDiffSeconds, this.aRelativeScales);
    }
    if (!aRange) {
        aRange = this._mRanges[sScale];
    }
    if (sScale == 'year' || sScale == 'month' || sScale == 'day') {
        oToday = new Date(Date.UTC(oToday.getFullYear(), oToday.getMonth(), oToday.getDate()));
        oDateUTC = new Date(0);
        if (bUTC) {
            oDateUTC.setUTCFullYear(oJSDate.getUTCFullYear(), oJSDate.getUTCMonth(), oJSDate.getUTCDate());
        } else {
            oDateUTC.setUTCFullYear(oJSDate.getFullYear(), oJSDate.getMonth(), oJSDate.getDate());
        }
        oJSDate = oDateUTC;
    }
    iDiff = this._getDifference(sScale, [
        oToday,
        oJSDate
    ]);
    if (this.oFormatOptions.relativeScale != 'auto' && (iDiff < aRange[0] || iDiff > aRange[1])) {
        return null;
    }
    sPattern = this.oLocaleData.getRelativePattern(sScale, iDiff, iDiffSeconds > 0, this.oFormatOptions.relativeStyle);
    return fnFormatMessage(sPattern, [Math.abs(iDiff)]);
};
DateFormat.prototype._mRanges = {
    second: [
        -60,
        60
    ],
    minute: [
        -60,
        60
    ],
    hour: [
        -24,
        24
    ],
    day: [
        -6,
        6
    ],
    week: [
        -4,
        4
    ],
    month: [
        -12,
        12
    ],
    year: [
        -10,
        10
    ]
};
DateFormat.prototype._mScales = {
    second: 1,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2592000,
    quarter: 7776000,
    year: 31536000
};
DateFormat.prototype._getScale = function (iDiffSeconds, aScales) {
    var sScale, sTestScale;
    iDiffSeconds = Math.abs(iDiffSeconds);
    for (var i = 0; i < aScales.length; i++) {
        sTestScale = aScales[i];
        if (iDiffSeconds >= this._mScales[sTestScale]) {
            sScale = sTestScale;
            break;
        }
    }
    if (!sScale) {
        sScale = aScales[aScales.length - 1];
    }
    return sScale;
};
function cutDateFields(oDate, iStartIndex) {
    var aFields = [
            'FullYear',
            'Month',
            'Date',
            'Hours',
            'Minutes',
            'Seconds',
            'Milliseconds'
        ], sMethodName;
    for (var i = iStartIndex; i < aFields.length; i++) {
        sMethodName = 'set' + aFields[iStartIndex];
        oDate[sMethodName].apply(oDate, [0]);
    }
}
var mRelativeDiffs = {
    year: function (oFromDate, oToDate) {
        return oToDate.getFullYear() - oFromDate.getFullYear();
    },
    month: function (oFromDate, oToDate) {
        return oToDate.getMonth() - oFromDate.getMonth() + this.year(oFromDate, oToDate) * 12;
    },
    week: function (oFromDate, oToDate, oFormat) {
        var iFromDay = oFormat._adaptDayOfWeek(oFromDate.getDay());
        var iToDay = oFormat._adaptDayOfWeek(oToDate.getDay());
        cutDateFields(oFromDate, 3);
        cutDateFields(oToDate, 3);
        return (oToDate.getTime() - oFromDate.getTime() - (iToDay - iFromDay) * oFormat._mScales.day * 1000) / (oFormat._mScales.week * 1000);
    },
    day: function (oFromDate, oToDate, oFormat) {
        cutDateFields(oFromDate, 3);
        cutDateFields(oToDate, 3);
        return (oToDate.getTime() - oFromDate.getTime()) / (oFormat._mScales.day * 1000);
    },
    hour: function (oFromDate, oToDate, oFormat) {
        cutDateFields(oFromDate, 4);
        cutDateFields(oToDate, 4);
        return (oToDate.getTime() - oFromDate.getTime()) / (oFormat._mScales.hour * 1000);
    },
    minute: function (oFromDate, oToDate, oFormat) {
        cutDateFields(oFromDate, 5);
        cutDateFields(oToDate, 5);
        return (oToDate.getTime() - oFromDate.getTime()) / (oFormat._mScales.minute * 1000);
    },
    second: function (oFromDate, oToDate, oFormat) {
        cutDateFields(oFromDate, 6);
        cutDateFields(oToDate, 6);
        return (oToDate.getTime() - oFromDate.getTime()) / (oFormat._mScales.second * 1000);
    }
};
DateFormat.prototype._adaptDayOfWeek = function (iDayOfWeek) {
    var iFirstDayOfWeek = LocaleData.getInstance(sap.ui.getWCCore().getFormatSettings().getFormatLocale()).getFirstDayOfWeek();
    var iDayNumberOfWeek = iDayOfWeek - (iFirstDayOfWeek - 1);
    if (iDayNumberOfWeek <= 0) {
        iDayNumberOfWeek += 7;
    }
    return iDayNumberOfWeek;
};
DateFormat.prototype._getDifference = function (sScale, aDates) {
    var oFromDate = aDates[0];
    var oToDate = aDates[1];
    return Math.round(mRelativeDiffs[sScale](oFromDate, oToDate, this));
};
DateFormat.prototype.getAllowedCharacters = function (aFormatArray) {
    if (this.oFormatOptions.relative) {
        return '';
    }
    var sAllowedCharacters = '';
    var bNumbers = false;
    var bAll = false;
    var oPart;
    for (var i = 0; i < aFormatArray.length; i++) {
        oPart = aFormatArray[i];
        switch (oPart.type) {
        case 'text':
            if (sAllowedCharacters.indexOf(oPart.value) < 0) {
                sAllowedCharacters += oPart.value;
            }
            break;
        case 'day':
        case 'year':
        case 'weekYear':
        case 'dayNumberOfWeek':
        case 'weekInYear':
        case 'hour0_23':
        case 'hour1_24':
        case 'hour0_11':
        case 'hour1_12':
        case 'minute':
        case 'second':
        case 'fractionalsecond':
            if (!bNumbers) {
                sAllowedCharacters += '0123456789';
                bNumbers = true;
            }
            break;
        case 'month':
        case 'monthStandalone':
            if (oPart.digits < 3) {
                if (!bNumbers) {
                    sAllowedCharacters += '0123456789';
                    bNumbers = true;
                }
            } else {
                bAll = true;
            }
            break;
        default:
            bAll = true;
            break;
        }
    }
    if (bAll) {
        sAllowedCharacters = '';
    }
    return sAllowedCharacters;
};

/**
 * Different calendar types.
 */
const CalendarTypes = {
	Gregorian: "Gregorian",
	Islamic: "Islamic",
	Japanese: "Japanese",
	Buddhist: "Buddhist",
	Persian: "Persian",
};

class CalendarType$1 extends DataType {
	static isValid(value) {
		return !!CalendarTypes[value];
	}
}

CalendarType$1.generataTypeAcessors(CalendarTypes);

class CalendarDate {
	constructor() {
		let aArgs = arguments, // eslint-disable-line
			oJSDate,
			oNow,
			sCalendarType;

		switch (aArgs.length) {
		case 0: // defaults to the current date
			oNow = new Date();
			return this.constructor(oNow.getFullYear(), oNow.getMonth(), oNow.getDate());

		case 1: // CalendarDate
		case 2: // CalendarDate, sCalendarType
			if (!(aArgs[0] instanceof CalendarDate)) {
				throw new Error("Invalid arguments: the first argument must be of type sap.ui.unified.calendar.CalendarDate.");
			}
			sCalendarType = aArgs[1] ? aArgs[1] : aArgs[0]._oUDate.sCalendarType;
			// Use source.valueOf() (returns the same point of time regardless calendar type) instead of
			// source's getters to avoid non-gregorian Year, Month and Date may be used to construct a Gregorian date
			oJSDate = new Date(aArgs[0].valueOf());

			// Make this date really local. Now getters are safe.
			oJSDate.setFullYear(oJSDate.getUTCFullYear(), oJSDate.getUTCMonth(), oJSDate.getUTCDate());
			oJSDate.setHours(oJSDate.getUTCHours(), oJSDate.getUTCMinutes(), oJSDate.getUTCSeconds(), oJSDate.getUTCMilliseconds());

			this._oUDate = createUniversalUTCDate(oJSDate, sCalendarType);
			break;

		case 3: // year, month, date
		case 4: // year, month, date, sCalendarType
			checkNumericLike(aArgs[0], `Invalid year: ${aArgs[0]}`);
			checkNumericLike(aArgs[1], `Invalid month: ${aArgs[1]}`);
			checkNumericLike(aArgs[2], `Invalid date: ${aArgs[2]}`);

			oJSDate = new Date(0, 0, 1);
			oJSDate.setFullYear(aArgs[0], aArgs[1], aArgs[2]); // 2 digits year is not supported. If so, it is considered as full year as well.

			if (aArgs[3]) {
				sCalendarType = aArgs[3];
			}
			this._oUDate = createUniversalUTCDate(oJSDate, sCalendarType);
			break;

		default:
			throw new Error(`${"Invalid arguments. Accepted arguments are: 1) oCalendarDate, (optional)calendarType"
				+ "or 2) year, month, date, (optional) calendarType"}${aArgs}`);
		}
	}

	getYear() {
		return this._oUDate.getUTCFullYear();
	}

	setYear(year) {
		checkNumericLike(year, `Invalid year: ${year}`);
		this._oUDate.setUTCFullYear(year);
		return this;
	}

	getMonth() {
		return this._oUDate.getUTCMonth();
	}

	setMonth(month) {
		checkNumericLike(month, `Invalid month: ${month}`);
		this._oUDate.setUTCMonth(month);
		return this;
	}

	getDate() {
		return this._oUDate.getUTCDate();
	}

	setDate(date) {
		checkNumericLike(date, `Invalid date: ${date}`);
		this._oUDate.setUTCDate(date);
		return this;
	}

	getDay() {
		return this._oUDate.getUTCDay();
	}

	getCalendarType() {
		return this._oUDate.sCalendarType;
	}

	isBefore(oCalendarDate) {
		checkCalendarDate(oCalendarDate);
		return this.valueOf() < oCalendarDate.valueOf();
	}

	isAfter(oCalendarDate) {
		checkCalendarDate(oCalendarDate);
		return this.valueOf() > oCalendarDate.valueOf();
	}

	isSameOrBefore(oCalendarDate) {
		checkCalendarDate(oCalendarDate);
		return this.valueOf() <= oCalendarDate.valueOf();
	}

	isSameOrAfter(oCalendarDate) {
		checkCalendarDate(oCalendarDate);
		return this.valueOf() >= oCalendarDate.valueOf();
	}

	isSame(oCalendarDate) {
		checkCalendarDate(oCalendarDate);
		return this.valueOf() === oCalendarDate.valueOf();
	}

	toLocalJSDate() {
		// Use this._oUDate.getTime()(returns the same point of time regardless calendar type)  instead of
		// this._oUDate's getters to avoid non-gregorian Year, Month and Date to be used to construct a Gregorian date
		const oLocalDate = new Date(this._oUDate.getTime());

		// Make this date really local. Now getters are safe.
		oLocalDate.setFullYear(oLocalDate.getUTCFullYear(), oLocalDate.getUTCMonth(), oLocalDate.getUTCDate());
		oLocalDate.setHours(0, 0, 0, 0);

		return oLocalDate;
	}

	toUTCJSDate() {
		// Use this._oUDate.getTime()(returns the same point of time regardless calendar type)  instead of
		// this._oUDate's getters to avoid non-gregorian Year, Month and Date to be used to construct a Gregorian date
		const oUTCDate = new Date(this._oUDate.getTime());
		oUTCDate.setUTCHours(0, 0, 0, 0);

		return oUTCDate;
	}

	toString() {
		return `${this._oUDate.sCalendarType}: ${this.getYear()}/${this.getMonth() + 1}/${this.getDate()}`;
	}

	valueOf() {
		return this._oUDate.getTime();
	}

	static fromLocalJSDate(oJSDate, sCalendarType) {
		// Cross frame check for a date should be performed here otherwise setDateValue would fail in OPA tests
		// because Date object in the test is different than the Date object in the application (due to the iframe).
		// We can use jQuery.type or this method:
		function isValidDate(date) {
			return date && Object.prototype.toString.call(date) === "[object Date]" && !isNaN(date); // eslint-disable-line
		}
		if (!isValidDate) {
			throw new Error(`Date parameter must be a JavaScript Date object: [${oJSDate}].`);
		}
		return new CalendarDate(oJSDate.getFullYear(), oJSDate.getMonth(), oJSDate.getDate(), sCalendarType);
	}

	static fromTimestamp(iTimestamp, sCalendarType) {
		const oCalDate = new CalendarDate(0, 0, 1);
		oCalDate._oUDate = UniversalDate.getInstance(new Date(iTimestamp), sCalendarType);
		return oCalDate;
	}
}

function createUniversalUTCDate(oDate, sCalendarType) {
	if (sCalendarType) {
		return UniversalDate.getInstance(createUTCDate(oDate), sCalendarType);
	}
	return new UniversalDate(createUTCDate(oDate).getTime());
}

/**
 * Creates a JavaScript UTC Date corresponding to the given JavaScript Date.
 * @param {Date} oDate JavaScript date object. Time related information is cut.
 * @returns {Date} JavaScript date created from the date object, but this time considered as UTC date information.
 */
function createUTCDate(oDate) {
	const oUTCDate = new Date(Date.UTC(0, 0, 1));

	oUTCDate.setUTCFullYear(oDate.getFullYear(), oDate.getMonth(), oDate.getDate());

	return oUTCDate;
}

function checkCalendarDate(oCalendarDate) {
	if (!(oCalendarDate instanceof CalendarDate)) {
		throw new Error(`Invalid calendar date: [${oCalendarDate}]. Expected: sap.ui.unified.calendar.CalendarDate`);
	}
}

/**
 * Verifies the given value is numeric like, i.e. 3, "3" and throws an error if it is not.
 * @param {any} value The value of any type to check. If null or undefined, this method throws an error.
 * @param {string} message The message to be used if an error is to be thrown
 * @throws will throw an error if the value is null or undefined or is not like a number
 */
function checkNumericLike(value, message) {
	if (value === undefined || value === Infinity || isNaN(value)) { // eslint-disable-line
		throw message;
	}
}

/**
 * Different states.
 */
const ValueStates = {
	None: "None",
	Success: "Success",
	Warning: "Warning",
	Error: "Error",
};

class ValueState extends DataType {
	static isValid(value) {
		return !!ValueStates[value];
	}
}

ValueState.generataTypeAcessors(ValueStates);

var mKeyCodes = {
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  SHIFT: 16,
  CONTROL: 17,
  ALT: 18,
  BREAK: 19,
  CAPS_LOCK: 20,
  ESCAPE: 27,
  SPACE: 32,
  PAGE_UP: 33,
  PAGE_DOWN: 34,
  END: 35,
  HOME: 36,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_RIGHT: 39,
  ARROW_DOWN: 40,
  PRINT: 44,
  INSERT: 45,
  DELETE: 46,
  DIGIT_0: 48,
  DIGIT_1: 49,
  DIGIT_2: 50,
  DIGIT_3: 51,
  DIGIT_4: 52,
  DIGIT_5: 53,
  DIGIT_6: 54,
  DIGIT_7: 55,
  DIGIT_8: 56,
  DIGIT_9: 57,
  A: 65,
  B: 66,
  C: 67,
  D: 68,
  E: 69,
  F: 70,
  G: 71,
  H: 72,
  I: 73,
  J: 74,
  K: 75,
  L: 76,
  M: 77,
  N: 78,
  O: 79,
  P: 80,
  Q: 81,
  R: 82,
  S: 83,
  T: 84,
  U: 85,
  V: 86,
  W: 87,
  X: 88,
  Y: 89,
  Z: 90,
  WINDOWS: 91,
  CONTEXT_MENU: 93,
  TURN_OFF: 94,
  SLEEP: 95,
  NUMPAD_0: 96,
  NUMPAD_1: 97,
  NUMPAD_2: 98,
  NUMPAD_3: 99,
  NUMPAD_4: 100,
  NUMPAD_5: 101,
  NUMPAD_6: 102,
  NUMPAD_7: 103,
  NUMPAD_8: 104,
  NUMPAD_9: 105,
  NUMPAD_ASTERISK: 106,
  NUMPAD_PLUS: 107,
  NUMPAD_MINUS: 109,
  NUMPAD_COMMA: 110,
  NUMPAD_SLASH: 111,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
  NUM_LOCK: 144,
  SCROLL_LOCK: 145,
  OPEN_BRACKET: 186,
  PLUS: 187,
  COMMA: 188,
  SLASH: 189,
  DOT: 190,
  PIPE: 191,
  SEMICOLON: 192,
  MINUS: 219,
  GREAT_ACCENT: 220,
  EQUALS: 221,
  SINGLE_QUOTE: 222,
  BACKSLASH: 226
};

const isEnter = event => (event.key ? event.key === "Enter" : event.keyCode === mKeyCodes.ENTER) && !hasModifierKeys(event);

const isSpace = event => (event.key ? (event.key === "Spacebar" || event.key === " ") : event.keyCode === mKeyCodes.SPACE) && !hasModifierKeys(event);

const isLeft = event => (event.key ? (event.key === "ArrowLeft" || event.key === "Left") : event.keyCode === mKeyCodes.ARROW_LEFT) && !hasModifierKeys(event);

const isRight = event => (event.key ? (event.key === "ArrowRight" || event.key === "Right") : event.keyCode === mKeyCodes.ARROW_RIGHT) && !hasModifierKeys(event);

const isUp = event => (event.key ? (event.key === "ArrowUp" || event.key === "Up") : event.keyCode === mKeyCodes.ARROW_UP) && !hasModifierKeys(event);

const isDown = event => (event.key ? (event.key === "ArrowDown" || event.key === "Down") : event.keyCode === mKeyCodes.ARROW_DOWN) && !hasModifierKeys(event);

const isHome = event => (event.key ? event.key === "Home" : event.keyCode === mKeyCodes.HOME) && !hasModifierKeys(event);

const isEnd = event => (event.key ? event.key === "End" : event.keyCode === mKeyCodes.END) && !hasModifierKeys(event);

const isEscape = event => (event.key ? event.key === "Escape" || event.key === "Esc" : event.keyCode === mKeyCodes.ESCAPE) && !hasModifierKeys(event);

const isShow = event => {
	if (event.key) {
		return (event.key === "F4" && !hasModifierKeys(event)) || (((event.key === "ArrowDown" || event.key === "Down") || (event.key === "ArrowUp" || event.key === "Up")) && checkModifierKeys(event, /* Ctrl */ false, /* Alt */ true, /* Shift */ false));
	}

	return (event.keyCode === mKeyCodes.F4 && !hasModifierKeys(event)) || (event.keyCode === mKeyCodes.ARROW_DOWN && checkModifierKeys(event, /* Ctrl */ false, /* Alt */ true, /* Shift */ false));
};

const hasModifierKeys = event => event.shiftKey || event.altKey || getCtrlKey(event);

const getCtrlKey = event => !!(event.metaKey || event.ctrlKey); // double negation doesn't have effect on boolean but ensures null and undefined are equivalent to false.

const checkModifierKeys = (oEvent, bCtrlKey, bAltKey, bShiftKey) => oEvent.shiftKey === bShiftKey && oEvent.altKey === bAltKey && getCtrlKey(oEvent) === bCtrlKey;

/*
	lit-html directive that removes and attribute if it is undefined
*/
var ifDefined = directive(value => part => {
	if ((value === undefined) && part instanceof AttributePart) {
		if (value !== part.value) {
			const name = part.committer.name;
			part.committer.element.removeAttribute(name);
		}
	} else if (part.committer && part.committer.element && part.committer.element.getAttribute(part.committer.name) === value) {
		part.setValue(noChange);
	} else {
		part.setValue(value);
	}
});

const block0 = (context) => { return html`<span	class="${ifDefined(classMap(context.classes.main))}"	style="${ifDefined(context.fontStyle)}"	tabindex="-1"	data-sap-ui-icon-content="${ifDefined(context.iconContent)}"	dir="${ifDefined(context.dir)}"></span>`; };

var iconCss = ":host(ui5-icon:not([hidden])){display:inline-block;outline:none;color:var(--sapUiContentNonInteractiveIconColor,var(--sapContent_NonInteractiveIconColor,var(--sapPrimary7,#6a6d70)))}ui5-icon:not([hidden]){display:inline-block;outline:none;color:var(--sapUiContentNonInteractiveIconColor,var(--sapContent_NonInteractiveIconColor,var(--sapPrimary7,#6a6d70)))}.sapWCIcon{width:100%;height:100%;display:flex;justify-content:center;align-items:center;outline:none;border-style:none;pointer-events:none}.sapWCIcon:before{content:attr(data-sap-ui-icon-content);speak:none;font-weight:400;-webkit-font-smoothing:antialiased;display:flex;justify-content:center;align-items:center;width:100%;height:100%;pointer-events:none}[dir=rtl].sapWCIconMirrorInRTL:not(.sapWCIconSuppressMirrorInRTL):after,[dir=rtl].sapWCIconMirrorInRTL:not(.sapWCIconSuppressMirrorInRTL):before{transform:scaleX(-1)}";

/**
 * @public
 */
const metadata$1 = {
	tag: "ui5-icon",
	properties: /** @lends sap.ui.webcomponents.main.Icon.prototype */ {

		/**
		 * Defines the source URI of the <code>ui5-icon</code>.
		 * <br><br>
		 * SAP-icons font provides numerous options. To find all the available icons, see the
		 * <ui5-link target="_blank" href="https://openui5.hana.ondemand.com/test-resources/sap/m/demokit/iconExplorer/webapp/index.html" class="api-table-content-cell-link">Icon Explorer</ui5-link>.
		 * <br><br>
		 * Example:
		 * <br>
		 * <code>src='sap-icons://add'</code>, <code>src='sap-icons://delete'</code>, <code>src='sap-icons://employee'</code>.
		 *
		 * @type {string}
		 * @public
		*/
		src: {
			type: String,
		},
	},
	events: {
		press: {},
	},
};

/**
 * @class
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-icon</code> component is a wrapper around the HTML tag to embed an icon from an icon font.
 * There are two main scenarios how the <code>ui5-icon</code> component is used:
 * as a purely decorative element; or as a visually appealing clickable area in the form of an icon button.
 * In the first case, images are not predefined as tab stops in accessibility mode.
 * <br><br>
 * The <code>ui5-icon</code> uses embedded font instead of pixel image.
 * Comparing to image, <code>ui5-icon</code> is easily scalable,
 * its color can be altered live, and various effects can be added using CSS.
 * <br><br>
 * A large set of built-in icons is available
 * and they can be used by setting the <code>src</code> property on the <code>ui5-icon</code>.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/Icon";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Icon
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-icon
 * @public
 */
class Icon extends UI5Element {
	static get metadata() {
		return metadata$1;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0;
	}

	static get styles() {
		return iconCss;
	}

	focus() {
		HTMLElement.prototype.focus.call(this);
	}

	onclick() {
		this.fireEvent("press");
	}

	onkeydown(event) {
		if (isSpace(event)) {
			event.preventDefault();
			this.__spaceDown = true;
		} else if (isEnter(event)) {
			this.onclick(event);
		}
	}

	onkeyup(event) {
		if (isSpace(event) && this.__spaceDown) {
			this.fireEvent("press");
			this.__spaceDown = false;
		}
	}

	get classes() {
		const iconInfo = getIconInfo(this.src) || {};
		return {
			main: {
				sapWCIcon: true,
				sapWCIconMirrorInRTL: !iconInfo.suppressMirroring,
			},
		};
	}

	get iconContent() {
		const iconInfo = getIconInfo(this.src) || {};
		return iconInfo.content;
	}

	get dir() {
		return getRTL() ? "rtl" : "ltr";
	}

	get fontStyle() {
		const iconInfo = getIconInfo(this.src) || {};
		return `font-family: '${iconInfo.fontFamily}'`;
	}
}

Bootstrap.boot().then(_ => {
	Icon.define();
});

const rFocusable = /^(?:input|select|textarea|button)$/i,
	rClickable = /^(?:a|area)$/i;

class FocusHelper {
	static hasTabIndex(domElement) {
		if (domElement.disabled) {
			return false;
		}

		const tabIndex = domElement.getAttribute("tabindex");
		if (tabIndex !== null && tabIndex !== undefined) {
			return parseInt(tabIndex) >= 0;
		}

		return rFocusable.test(domElement.nodeName)
			|| (rClickable.test(domElement.nodeName)
			&& domElement.href);
	}

	static isHidden(domElement) {
		if (domElement.nodeName === "SLOT") {
			return false;
		}

		const rect = domElement.getBoundingClientRect();

		return (domElement.offsetWidth <= 0 && domElement.offsetHeight <= 0)
			|| domElement.style.visibility === "hidden"
			|| (rect.width === 0 && 0 && rect.height === 0);
	}

	static isVisible(domElement) {
		return !FocusHelper.isHidden(domElement);
	}

	static getCorrectElement(element) {
		if (element instanceof UI5Element) {
			// Focus the CustomElement itself or provide getDomRef of each ?
			return element.getFocusDomRef();
		}

		return element;
	}

	static findFocusableElement(container, forward) {
		let child;
		if (container.assignedNodes && container.assignedNodes()) {
			const assignedElements = container.assignedNodes();
			child = forward ? assignedElements[0] : assignedElements[assignedElements.length - 1];
		} else {
			child = forward ? container.firstChild : container.lastChild;
		}

		let focusableDescendant;

		while (child) {
			const originalChild = child;

			child = FocusHelper.getCorrectElement(child);
			if (!child) {
				return null;
			}

			if (child.nodeType === 1 && !FocusHelper.isHidden(child)) {
				if (FocusHelper.hasTabIndex(child)) {
					return child;
				}

				focusableDescendant = FocusHelper.findFocusableElement(child, forward);
				if (focusableDescendant) {
					return focusableDescendant;
				}
			}

			child = forward ? originalChild.nextSibling : originalChild.previousSibling;
		}

		return null;
	}

	static findFirstFocusableElement(container) {
		if (!container || FocusHelper.isHidden(container)) {
			return null;
		}

		return FocusHelper.findFocusableElement(container, true);
	}

	static findLastFocusableElement(container) {
		if (!container || FocusHelper.isHidden(container)) {
			return null;
		}

		return FocusHelper.findFocusableElement(container, false);
	}

	static hasTabbableContent(node) {
		let hasTabableContent = false,
			content = node.children; // eslint-disable-line

		if (content) {
			hasTabableContent = FocusHelper._hasTabbableContent(content);
		}

		// If the node is inside Custom Element,
		// check the content in the 'light' DOM.
		if (!hasTabableContent && FocusHelper._isInsideShadowRoot(node)) {
			const customElement = FocusHelper._getCustomElement(node);
			const content = customElement.children; // eslint-disable-line

			if (content) {
				hasTabableContent = FocusHelper._hasTabbableContent(content);
			}
		}

		return hasTabableContent;
	}

	static getLastTabbableElement(node) {
		const tabbableContent = FocusHelper.getTabbableContent(node);
		return tabbableContent.length ? tabbableContent[tabbableContent.length - 1] : null;
	}

	static getTabbableContent(node) {
		let aTabbableContent = [],
			content = node.children; // eslint-disable-line

		if (content) {
			aTabbableContent = FocusHelper._getTabbableContent(content);
		}

		if (FocusHelper._isInsideShadowRoot(node)) {
			const customElement = FocusHelper._getCustomElement(node);
			const content = customElement.children; // eslint-disable-line

			if (content) {
				aTabbableContent = [...aTabbableContent, ...FocusHelper._getTabbableContent(content)];
			}
		}

		return aTabbableContent;
	}

	static _getTabbableContent(nodes) {
		const aTabbableContent = [];

		Array.from(nodes).forEach(node => {
			let currentNode = node;

			while (currentNode) {
				if (FocusHelper._hasShadowRoot(currentNode)) {
					// as the content is in the <span> template and it is always 2nd child
					const children = currentNode.shadowRoot.children;
					currentNode = children.length === 1 ? children[0] : children[1];
				}

				if (FocusHelper._isNodeTabbable(currentNode)) {
					aTabbableContent.push(currentNode);
				}
				currentNode = currentNode.children && currentNode.children.length && currentNode.children[0];
			}
		});

		return aTabbableContent.filter(FocusHelper.isVisible);
	}

	static _hasTabbableContent(nodes) {
		let hasTabableContent = false;

		Array.from(nodes).forEach(node => {
			let currentNode = node;

			while (currentNode && !hasTabableContent) {
				if (FocusHelper._hasShadowRoot(currentNode)) {
					// as the content is in the <span> template and it is always 2nd child
					const children = currentNode.shadowRoot.children;
					currentNode = children.length === 1 ? children[0] : children[1];
				}

				hasTabableContent = FocusHelper._isNodeTabbable(currentNode);
				currentNode = currentNode.children.length && currentNode.children[0];
			}
		});

		return hasTabableContent;
	}

	static _isNodeTabbable(node) {
		if (!node) {
			return false;
		}

		const nodeName = node.nodeName.toLowerCase();

		if (node.hasAttribute("data-sap-no-tab-ref")) {
			return false;
		}

		// special tags
		if (nodeName === "a") {
			return !!node.href;
		}

		if (/input|select|textarea|button|object/.test(nodeName)) {
			return !node.disabled;
		}

		return FocusHelper.hasTabIndex(node);
	}

	static _hasShadowRoot(node) {
		return !!(node && node.shadowRoot);
	}

	static _isInsideShadowRoot(node) {
		return !!(node && node.getRootNode() && node.getRootNode().host);
	}

	static _getCustomElement(node) {
		return node.getRootNode().host;
	}
}

const PopoverPlacementTypes = {
	/**
	 * Popover will be placed at the left side of the reference element.
	 * @public
	 */
	Left: "Left",
	/**
	 * Popover will be placed at the right side of the reference element.
	 * @public
	 */
	Right: "Right",
	/**
	 * Popover will be placed at the top of the reference element.
	 * @public
	 */
	Top: "Top",
	/**
	 * Popover will be placed at the bottom of the reference element.
	 * @public
	 */
	Bottom: "Bottom",
};

class PopoverPlacementType extends DataType {
	static isValid(value) {
		return !!PopoverPlacementTypes[value];
	}
}

PopoverPlacementType.generataTypeAcessors(PopoverPlacementTypes);

const PopoverVerticalAligns = {
	Center: "Center",
	Top: "Top",
	Bottom: "Bottom",
	Stretch: "Stretch",
};


class PopoverVerticalAlign extends DataType {
	static isValid(value) {
		return !!PopoverVerticalAligns[value];
	}
}

PopoverVerticalAlign.generataTypeAcessors(PopoverVerticalAligns);

const PopoverHorizontalAligns = {
	Center: "Center",
	Left: "Left",
	Right: "Right",
	Stretch: "Stretch",
};

class PopoverHorizontalAlign extends DataType {
	static isValid(value) {
		return !!PopoverHorizontalAligns[value];
	}
}

PopoverHorizontalAlign.generataTypeAcessors(PopoverHorizontalAligns);

var styles = ".sapMPopupFrame{width:0;height:0;display:none;visibility:visible}.sapMPopupFrameOpen{display:inline}.sapMPopup{min-width:6.25rem;box-sizing:border-box;outline:none;max-width:100%;max-height:100%;background:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBaseColor,var(--sapPrimary3,#fff))));border:none;box-shadow:var(--sapUiShadowLevel2,0 .625rem 1.875rem 0 rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.15));border-radius:.25rem;min-height:2rem}.sapMPopup .sapMPopupHeader{margin:0;color:var(--sapUiPageHeaderTextColor,var(--sapPageHeader_TextColor,#32363a));font-size:1rem;font-weight:400;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));border-bottom:1px solid var(--sapUiPageFooterBorderColor,#d9d9d9)}.sapMPopup .sapMPopupHeaderText{padding:0 .25rem;text-align:center;height:3rem;line-height:3rem}.sapMPopup .sapMPopupFooter{font-size:1rem;font-weight:400;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));background:var(--sapUiPageFooterBackground,var(--sapPageFooter_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))));border-top:1px solid var(--sapUiPageFooterBorderColor,#d9d9d9);color:var(--sapUiPageFooterTextColor,var(--sapPageFooter_TextColor,#32363a))}.sapMPopup .sapMPopupContent{overflow:auto;position:relative;box-sizing:border-box;background-color:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBaseColor,var(--sapPrimary3,#fff))));border-radius:.25rem}.sapMPopup .sapMPopupContent,.sapMPopup .sapMPopupFooter{border-bottom-left-radius:.25rem;border-bottom-right-radius:.25rem}.sapMPopup .sapMPopupScroll{vertical-align:middle;box-sizing:border-box;padding:var(--_ui5_popover_content_padding,.4375em)}.sapUiBLy{background-color:#000;opacity:.6;filter:alpha(opacity=60);top:0;left:0;right:0;bottom:0;position:fixed;outline:0 none}.sapMPopupBlockLayer{visibility:visible}.sapMPopupBlockLayerHidden{display:none}";

/**
 * @public
 */
const metadata$2 = {
	"abstract": true,
	slots: /** @lends  sap.ui.webcomponents.main.Popup.prototype */ {

		/**
		 * Defines the content of the Web Component.
		 * @type {HTMLElement[]}
		 * @slot
		 * @public
		 */
		content: {
			type: HTMLElement,
			multiple: true,
		},

		/**
		 * Defines the header HTML Element.
		 *
		 * @type {HTMLElement}
		 * @slot
		 * @public
		 */
		header: {
			type: HTMLElement,
		},

		/**
		 * Defines the footer HTML Element.
		 *
		 * @type {HTMLElement}
		 * @slot
		 * @public
		 */
		footer: {
			type: HTMLElement,
		},
	},
	properties: /** @lends  sap.ui.webcomponents.main.Popup.prototype */ {
		/**
		 * Defines the ID of the HTML Element, which will get the initial focus.
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		initialFocus: {
			type: String,
			association: true,
		},
		/**
		 * Defines whether the header is hidden.
		 *
		 * @type {Boolean}
		 * @defaultvalue false
		 * @public
		 */
		noHeader: {
			type: Boolean,
		},
		/**
		 * Defines the header text.
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		headerText: {
			type: String,
		},

		_isOpen: {
			type: Boolean,
		},
		_zIndex: {
			type: Integer,
		},
		_hideBlockLayer: {
			type: Boolean,
		},
	},
	events: /** @lends  sap.ui.webcomponents.main.Popup.prototype */ {

		/**
		 * Fired before the component is opened.
		 *
		 * @public
		 * @event
		 */

		beforeOpen: {},
		/**
		 * Fired after the component is opened.
		 *
		 * @public
		 * @event
		 */

		afterOpen: {},
		/**
		 * Fired before the component is closed.
		 *
		 * @public
		 * @event
		 * @param {Boolean} escPressed Indicates that <code>ESC</code> key has triggered the event.
		 */

		beforeClose: {
			escPressed: { type: Boolean },
		},

		/**
		 * Fired after the component is closed.
		 *
		 * @public
		 * @event
		 */
		afterClose: {},
	},
};

const openedPopups = [];
let currentZIndex = 100;
let isBodyScrollingDisabled = false;
let customBLyBackStyleInserted = false;

function getParentHost(node) {
	while (node && !node.host) {
		node = node.parentNode;
	}

	return node && node.host;
}

function createBLyBackStyle() {
	if (customBLyBackStyleInserted) {
		return;
	}

	customBLyBackStyleInserted = true;

	const stylesheet = document.styleSheets[0];
	stylesheet.insertRule(".sapUiBLyBack {overflow: hidden;position: fixed;width:100%;height: 100%;}", 0);
}

function updateBlockLayers() {
	let popup,
		i,
		hasModal = false;

	for (i = openedPopups.length - 1; i >= 0; i--) {
		popup = openedPopups[i];
		if (hasModal) {
			popup._hideBlockLayer = true;
		} else {
			if (popup.isModal()) { // eslint-disable-line
				popup._hideBlockLayer = false;
				hasModal = true;
			}
		}
	}

	updateBodyScrolling(hasModal);
}

function updateBodyScrolling(hasModal) {
	if (isBodyScrollingDisabled === hasModal) {
		return;
	}

	createBLyBackStyle();

	if (hasModal) {
		document.body.style.top = `-${window.pageYOffset}px`;
		document.body.classList.add("sapUiBLyBack");
	} else {
		document.body.classList.remove("sapUiBLyBack");
		window.scrollTo(0, -parseFloat(document.body.style.top));
		document.body.style.top = "";
	}

	isBodyScrollingDisabled = hasModal;
}

/**
 * @class
 * <h3 class="comment-api-title">Overview</h3>
 * Represents a base class for all popup Web Components.
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Popup
 * @extends sap.ui.webcomponents.base.UI5Element
 * @public
 */
class Popup extends UI5Element {
	static get metadata() {
		return metadata$2;
	}

	static get styles() {
		return styles;
	}

	static getNextZIndex() {
		currentZIndex += 2;
		return currentZIndex;
	}

	static hitTest(popup, event) {
		const indexOf = openedPopups.indexOf(popup);
		let openedPopup;

		for (let i = indexOf; i < openedPopups.length; i++) {
			openedPopup = openedPopups[i];
			if (openedPopup.hitTest(event)) {
				return true;
			}
		}

		return false;
	}

	static hasModalPopup() {
		for (let i = 0; i < openedPopups.length; i++) {
			if (openedPopups[i].isModal()) {
				return true;
			}
		}

		return false;
	}

	constructor() {
		super();

		this._documentKeyDownHandler = this.documentKeyDown.bind(this);
	}

	isTopPopup() {
		return openedPopups.indexOf(this) === openedPopups.length - 1;
	}

	isModal() {
		return true;
	}

	documentKeyDown(event) {
		if (isEscape(event) && this.isTopPopup()) {
			this.escPressed = true;
			this.close();
		}
	}

	getPopupDomRef() {
		const domRef = this.getDomRef();
		return domRef && domRef.querySelector(".sapMPopup");
	}

	hitTest(_event) {
		return true;
	}

	open() {
		this.fireEvent("beforeOpen", { });

		this._isFirstTimeRendered = false;

		this._zIndex = Popup.getNextZIndex();
		openedPopups.push(this);

		updateBlockLayers();

		document.addEventListener("keydown", this._documentKeyDownHandler, true);
	}

	close() {
		this.fireEvent("beforeClose", {
			escPressed: this.escPressed,
		}, true);

		this.escPressed = false;

		document.removeEventListener("keydown", this._documentKeyDownHandler, true);

		const index = openedPopups.indexOf(this);
		openedPopups.splice(index, 1);

		updateBlockLayers();
	}

	initInitialFocus() {
		const initialFocus = this.initialFocus;
		let initialFocusDomRef = this.initialFocus;

		if (initialFocus && typeof initialFocus === "string") {
			initialFocusDomRef = document.getElementById(initialFocus);

			if (!initialFocusDomRef) {
				const parentHost = getParentHost(this);
				if (parentHost) {
					initialFocusDomRef = parentHost.shadowRoot.querySelector(`#${initialFocus}`);
				}
			}
		}

		this._initialFocusDomRef = initialFocusDomRef;
	}

	onFirstTimeAfterRendering() {
		if (this.isTopPopup()) {
			this.initInitialFocus();
			this.setInitialFocus(this.getPopupDomRef());
		}

		this.fireEvent("afterOpen", {});
	}

	onAfterRendering() {
		if (!this._isOpen) {
			return;
		}

		if (!this._isFirstTimeRendered) {
			this.onFirstTimeAfterRendering();
			this._isFirstTimeRendered = true;
		}
	}

	setInitialFocus(container) {
		if (this._initialFocusDomRef) {
			if (this._initialFocusDomRef !== document.activeElement) {
				this._initialFocusDomRef.focus();
			}
			return;
		}

		if (!container) {
			return;
		}

		const focusableElement = FocusHelper.findFirstFocusableElement(container);

		if (focusableElement) {
			focusableElement.focus();
		} else {
			container.focus();
		}
	}

	onfocusin(event) {
		this.preserveFocus(event, this.getPopupDomRef());
	}

	preserveFocus(event, container) {
		if (!this.isTopPopup()) {
			return;
		}

		let target = event.target;

		while (target.shadowRoot && target.shadowRoot.activeElement) {
			target = target.shadowRoot.activeElement;
		}

		let focusableElement;
		let isSpecialCase = false;

		switch (target.id) {
		case `${this._id}-firstfe`:
			focusableElement = FocusHelper.findLastFocusableElement(container);
			isSpecialCase = true;
			break;
		case `${this._id}-lastfe`:
			focusableElement = FocusHelper.findFirstFocusableElement(container);
			isSpecialCase = true;
			break;
		case `${this._id}-blocklayer`:
			focusableElement = this._currentFocusedElement
				|| FocusHelper.findFirstFocusableElement(container);
			isSpecialCase = true;
			break;
		}

		if (focusableElement) {
			focusableElement.focus();
		} else if (isSpecialCase) {
			container.focus();
		}

		this._currentFocusedElement = focusableElement || document.activeElement;
	}

	storeCurrentFocus() {
		let element = document.activeElement;

		while (element.shadowRoot && element.shadowRoot.activeElement) {
			element = element.shadowRoot.activeElement;
		}

		this._lastFocusableElement = element;
	}

	resetFocus() {
		if (!this._lastFocusableElement) {
			return;
		}

		const lastFocusableElement = this._lastFocusableElement;
		if (lastFocusableElement) {
			lastFocusableElement.focus();
		}

		this._lastFocusableElement = null;
	}
}

const block0$1 = (context) => { return html`<span class="${ifDefined(classMap(context.classes.frame))}"><span id="${ifDefined(context._id)}-firstfe" tabindex="0" @focusin=${ifDefined(context.focusHelper.forwardToLast)}></span><div style="${ifDefined(styleMap$1(context.styles.main))}" role="dialog" aria-labelledby="${ifDefined(context.headerId)}" tabindex="-1" class="${ifDefined(classMap(context.classes.main))}">			${ !context.noHeader ? block1(context) : undefined }<div id="${ifDefined(context._id)}-content" role="application" style="${ifDefined(styleMap$1(context.styles.content))}" class="sapMPopupContent"><div class="sapMPopupScroll"><slot></slot></div></div>			${ context.footer ? block4(context) : undefined }<span id="${ifDefined(context._id)}-arrow" style="${ifDefined(styleMap$1(context.styles.arrow))}" class="${ifDefined(classMap(context.classes.arrow))}"></span></div><span id="${ifDefined(context._id)}-lastfe" tabindex="0" @focusin=${ifDefined(context.focusHelper.forwardToFirst)}></span><div tabindex="0" id="${ifDefined(context._id)}-blocklayer" style="${ifDefined(styleMap$1(context.styles.blockLayer))}" class="${ifDefined(classMap(context.classes.blockLayer))}"></div></span>`; };
const block1 = (context) => { return html`<header>			${ context.header ? block2(context) : block3(context) }</header>	`; };
const block2 = (context) => { return html`<div role="toolbar" class="sapMPopupHeader"><slot name="header"></slot></div>			`; };
const block3 = (context) => { return html`<h2 role="toolbar" class="sapMPopupHeader sapMPopupHeaderText">${ifDefined(context.headerText)}</h2>			`; };
const block4 = (context) => { return html`<footer><div class="sapMPopupFooter"><slot name="footer"></slot></div></footer>	`; };

var popoverCss = ".sapMPopover{position:fixed;z-index:10}.sapMPopoverArr{pointer-events:none;display:block;width:1rem;height:1rem;position:absolute;overflow:hidden}.sapMPopoverArr:after{content:\" \";display:block;width:.7rem;height:.7rem;background-color:var(--sapUiGroupContentBackground,var(--sapGroup_ContentBackground,var(--sapBaseColor,var(--sapPrimary3,#fff))));transform:rotate(-45deg)}.sapMPopoverArrUp{left:calc(50% - .5625rem);top:-.5rem;height:.5625rem}.sapMPopoverArrUp:after{margin:.1875rem 0 0 .1875rem;box-shadow:-.375rem .375rem .75rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3)),0 0 .125rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3))}.sapMPopoverArrRight{top:calc(50% - .5625rem);right:-.5625rem;width:.5625rem}.sapMPopoverArrRight:after{margin:.1875rem 0 0 -.375rem;box-shadow:-.375rem -.375rem .75rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3)),0 0 .125rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3))}.sapMPopoverArrDown{left:calc(50% - .5625rem);height:.5625rem}.sapMPopoverArrDown:after{margin:-.375rem 0 0 .125rem;box-shadow:.375rem -.375rem .75rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3)),0 0 .125rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3))}.sapMPopoverArrLeft{left:-.5625rem;top:calc(50% - .5625rem);width:.5625rem;height:1rem}.sapMPopoverArrLeft:after{margin:.125rem 0 0 .25rem;box-shadow:.375rem .375rem .75rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3)),0 0 .125rem 0 var(--_ui5_popover_arrow_shadow_color,rgba(0,0,0,.3))}.sapMPopoverArr.sapMPopoverArrHidden{display:none}.sapMPopover{transform:translateZ(0)}";

/**
 * @public
 */
const metadata$3 = {
	tag: "ui5-popover",
	properties: /** @lends sap.ui.webcomponents.main.Popover.prototype */ {

		/**
		 * Determines on which side the <code>ui5-popover</code> is placed at.
		 *
		 * @type {PopoverPlacementType}
		 * @defaultvalue "Right"
		 * @public
		 */
		placementType: {
			type: PopoverPlacementType,
			defaultValue: PopoverPlacementType.Right,
		},

		/**
		 * Determines the horizontal alignment of the <code>ui5-popover</code>.
		 *
		 * @type {PopoverHorizontalAlign}
		 * @defaultvalue "Center"
		 * @public
		 */
		horizontalAlign: {
			type: PopoverHorizontalAlign,
			defaultValue: PopoverHorizontalAlign.Center,
		},

		/**
		 * Determines the vertical alignment of the <code>ui5-popover</code>.
		 *
		 * @type {PopoverVerticalAlign}
		 * @defaultvalue "Center"
		 * @public
		 */
		verticalAlign: {
			type: PopoverVerticalAlign,
			defaultValue: PopoverVerticalAlign.Center,
		},

		/**
		 * Defines whether the <code>ui5-popover</code> should close when
		 * clicking/tapping outside of the popover.
		 * If enabled, it blocks any interaction with the background.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		modal: {
			type: Boolean,
		},

		/**
		 * Determines whether the <code>ui5-popover</code> arrow is hidden.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		noArrow: {
			type: Boolean,
		},

		/**
		 * Determines whether the <code>ui5-popover</code> would close upon user scroll.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		stayOpenOnScroll: {
			type: Boolean,
		},

		/**
		 * Determines if there is no enough space, the <code>ui5-popover</code> can be placed
		 * over the target.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		allowTargetOverlap: {
			type: Boolean,
		},

		_left: {
			type: Integer,
		},
		_top: {
			type: Integer,
		},

		_width: {
			type: String,
		},
		_height: {
			type: String,
		},

		_maxContentHeight: {
			type: Integer,
		},

		_arrowTranslateX: {
			type: Integer,
			defaultValue: 0,
		},

		_arrowTranslateY: {
			type: Integer,
			defaultValue: 0,
		},
		_actualPlacementType: {
			type: PopoverPlacementType,
			defaultValue: PopoverPlacementType.Right,
		},
		_focusElementsHandlers: {
			type: Object,
		},
	},
};

const diffTolerance = 32;
const dockInterval = 200;
const arrowSize = 8;

/**
 * @class
 *
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-popover</code> component displays additional information for an object
 * in a compact way and without leaving the page.
 * The Popover can contain various UI elements, such as fields, tables, images, and charts.
 * It can also include actions in the footer.
 *
 * <h3>Structure</h3>
 *
 * The popover has three main areas:
 * <ul>
 * <li>Header (optional) - with a back button and a title</li>
 * <li>Content - holds all the Web Component</li>
 * <li>Footer (optional) - with additional action buttons</li>
 * </ul>
 *
 * <b>Note:</b> The <code>ui5-popover</code> is closed when the user clicks
 * or taps outside the popover
 * or selects an action within the popover. You can prevent this with the
 * <code>modal</code> property.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/Popover";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Popover
 * @extends Popup
 * @tagname ui5-popover
 * @public
 */
class Popover extends Popup {
	static get metadata() {
		return metadata$3;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$1;
	}

	static get styles() {
		return [Popup.styles, popoverCss];
	}

	constructor() {
		super();

		this._documentMouseDownHandler = this.documentMouseDown.bind(this);

		const that = this;

		this._focusElementsHandlers = {
			forwardToFirst: event => {
				const firstFocusable = FocusHelper.findFirstFocusableElement(that);

				if (firstFocusable) {
					firstFocusable.focus();
				}
			},
			forwardToLast: event => {
				const lastFocusable = FocusHelper.findLastFocusableElement(that);

				if (lastFocusable) {
					lastFocusable.focus();
				}
			},
		};
	}

	isModal() {
		return this.modal;
	}

	static isInRect(x, y, rect) {
		return x >= rect.left && x <= rect.right
			&& y >= rect.top && y <= rect.bottom;
	}

	static getClientRect(domRef) {
		const rect = domRef.getBoundingClientRect();
		const computedStyle = window.getComputedStyle(domRef);

		const offsetLeft = parseFloat(computedStyle.paddingLeft);
		const offsetRight = parseFloat(computedStyle.paddingRight);
		const offsetTop = parseFloat(computedStyle.paddingTop);
		const offsetBottom = parseFloat(computedStyle.paddingBottom);

		return {
			left: rect.left + offsetLeft,
			right: rect.right - offsetRight,
			top: rect.top + offsetTop,
			bottom: rect.bottom - offsetBottom,
			width: rect.width - offsetLeft - offsetRight,
			height: rect.height - offsetTop - offsetBottom,
		};
	}

	hitTest(event) {
		const domRef = this.getPopupDomRef();
		const rect = domRef.getBoundingClientRect();
		let x,
			y;

		if (event.touches) {
			const touch = event.touches[0];
			x = touch.clientX;
			y = touch.clientY;
		} else {
			x = event.clientX;
			y = event.clientY;
		}

		// don't close the popover if the "initial focus" is outside the popover
		// and the user click/touch on it
		if (this.initialFocus && this._initialFocusDomRef) {
			const initialFocusRect = this._initialFocusDomRef.getBoundingClientRect();
			if (Popover.isInRect(x, y, initialFocusRect)) {
				return true;
			}
		}

		if (this._targetElement) {
			const targetElementRect = this._targetElement.getBoundingClientRect();
			if (Popover.isInRect(x, y, targetElementRect)) {
				return true;
			}
		}

		return Popover.isInRect(x, y, rect);
	}

	documentMouseDown(event) {
		if (!this.modal && !Popup.hitTest(this, event)) {
			this.close();
		}
	}

	checkDocking() {
		if (!this.stayOpenOnScroll && this.hasTargetElementMoved()) {
			this.close();
		}

		const popoverDomRef = this.getPopupDomRef();

		const popoverSize = {
			width: popoverDomRef.offsetWidth,
			height: popoverDomRef.offsetHeight,
		};

		const targetRect = Popover.getClientRect(this._targetElement);

		this.setLocation(targetRect, popoverSize);
	}

	getVerticalLeft(targetRect, popoverSize) {
		let left;

		switch (this.horizontalAlign) {
		case PopoverHorizontalAlign.Center:
		case PopoverHorizontalAlign.Stretch:
			left = targetRect.left - (popoverSize.width - targetRect.width) / 2;
			break;
		case PopoverHorizontalAlign.Left:
			left = targetRect.left;
			break;
		case PopoverHorizontalAlign.Right:
			left = targetRect.right - popoverSize.width;
			break;
		}

		return left;
	}

	getHorizontalTop(targetRect, popoverSize) {
		let top;

		switch (this.verticalAlign) {
		case PopoverVerticalAlign.Center:
		case PopoverVerticalAlign.Stretch:
			top = targetRect.top - (popoverSize.height - targetRect.height) / 2;
			break;
		case PopoverVerticalAlign.Top:
			top = targetRect.top;
			break;
		case PopoverVerticalAlign.Bottom:
			top = targetRect.bottom - popoverSize.height;
			break;
		}

		return top;
	}

	getActualPlacementType(targetRect, popoverSize) {
		const placementType = this.placementType;
		let actualPlacementType = placementType;

		const clientWidth = document.documentElement.clientWidth;
		const clientHeight = document.documentElement.clientHeight;

		switch (placementType) {
		case PopoverPlacementType.Top:
			if (targetRect.top < popoverSize.height
				&& targetRect.top < clientHeight - targetRect.bottom) {
				actualPlacementType = PopoverPlacementType.Bottom;
			}
			break;
		case PopoverPlacementType.Bottom:
			if (clientHeight - targetRect.bottom < popoverSize.height
				&& clientHeight - targetRect.bottom < targetRect.top) {
				actualPlacementType = PopoverPlacementType.Top;
			}
			break;
		case PopoverPlacementType.Left:
			if (targetRect.left < popoverSize.width
				&& targetRect.left < clientWidth - targetRect.right) {
				actualPlacementType = PopoverPlacementType.Right;
			}
			break;
		case PopoverPlacementType.Right:
			if (clientWidth - targetRect.right < popoverSize.width
				&& clientWidth - targetRect.right < targetRect.left) {
				actualPlacementType = PopoverPlacementType.Left;
			}
			break;
		}

		this._actualPlacementType = actualPlacementType;

		return actualPlacementType;
	}

	setLocation(targetRect, popoverSize) {
		let left = 0;
		let top = 0;
		const allowTargetOverlap = this.allowTargetOverlap;

		const clientWidth = document.documentElement.clientWidth;
		const clientHeight = document.documentElement.clientHeight;

		let maxHeight = clientHeight;

		let width = "";
		let height = "";

		const placementType = this.getActualPlacementType(targetRect, popoverSize);

		const isVertical = placementType === PopoverPlacementType.Top
			|| placementType === PopoverPlacementType.Bottom;

		if (this.horizontalAlign === PopoverHorizontalAlign.Stretch && isVertical) {
			popoverSize.width = targetRect.width;
			width = `${targetRect.width}px`;
		} else if (this.verticalAlign === PopoverVerticalAlign.Stretch && !isVertical) {
			popoverSize.height = targetRect.height;
			height = `${targetRect.height}px`;
		}

		this._width = width;
		this._height = height;

		const arrowOffset = this.noArrow ? 0 : arrowSize;

		// calc popover positions
		switch (placementType) {
		case PopoverPlacementType.Top:
			left = this.getVerticalLeft(targetRect, popoverSize);
			top = Math.max(targetRect.top - popoverSize.height - arrowOffset, 0);

			if (!allowTargetOverlap) {
				maxHeight = targetRect.top - arrowOffset;
			}
			break;
		case PopoverPlacementType.Bottom:
			left = this.getVerticalLeft(targetRect, popoverSize);

			if (allowTargetOverlap) {
				top = Math.max(Math.min(targetRect.bottom + arrowOffset, clientHeight - popoverSize.height), 0);
			} else {
				top = targetRect.bottom + arrowOffset;
				maxHeight = clientHeight - targetRect.bottom - arrowOffset;
			}
			break;
		case PopoverPlacementType.Left:
			left = Math.max(targetRect.left - popoverSize.width - arrowOffset, 0);
			top = this.getHorizontalTop(targetRect, popoverSize);
			break;
		case PopoverPlacementType.Right:
			if (allowTargetOverlap) {
				left = Math.max(Math.min(targetRect.left + targetRect.width + arrowOffset, clientWidth - popoverSize.width), 0);
			} else {
				left = targetRect.left + targetRect.width + arrowOffset;
			}

			top = this.getHorizontalTop(targetRect, popoverSize);
			break;
		}

		// correct popover positions
		if (isVertical) {
			if (popoverSize.width > clientWidth || left < 0) {
				left = 0;
			} else if (left + popoverSize.width > clientWidth) {
				left -= left + popoverSize.width - clientWidth;
			}
		} else {
			if (popoverSize.height > clientHeight || top < 0) { // eslint-disable-line
				top = 0;
			} else if (top + popoverSize.height > clientHeight) {
				top -= top + popoverSize.height - clientHeight;
			}
		}

		let maxContentHeight = Math.round(maxHeight);

		if (!this.noHeader) {
			const headerDomRef = this.getPopupDomRef().querySelector(".sapMPopupHeader");
			if (headerDomRef) {
				maxContentHeight = Math.round(maxHeight - headerDomRef.offsetHeight);
			}
		}

		this._maxContentHeight = maxContentHeight;

		const arrowTranslateX = isVertical
			? targetRect.left + targetRect.width / 2 - left - popoverSize.width / 2 : 0;
		const arrowTranslateY = !isVertical
			? targetRect.top + targetRect.height / 2 - top - popoverSize.height / 2 : 0;

		this._arrowTranslateX = Math.round(arrowTranslateX);
		this._arrowTranslateY = Math.round(arrowTranslateY);

		if (this._left === undefined || Math.abs(this._left - left) > 1.5) {
			this._left = Math.round(left);
		}

		if (this._top === undefined || Math.abs(this._top - top) > 1.5) {
			this._top = Math.round(top);
		}
	}

	/**
	 * Opens the <code>Popover</code>.
	 * @param {object} control This is the component to which the
	 * <code>ui5-popover</code> will be placed.
	 * The side of the placement depends on the <code>placementType</code> property
	 * set in the <code>ui5-popover</code>.
	 * @public
	 */
	openBy(element) {
		if (this._isOpen) {
			return;
		}

		const cancelled = super.open();
		if (cancelled) {
			return true;
		}

		this.storeCurrentFocus();

		const targetDomRef = element;

		const popoverSize = this.getPopoverSize();
		const targetRect = Popover.getClientRect(targetDomRef);

		this._targetElement = targetDomRef;
		this._targetRect = targetRect;

		this.setLocation(targetRect, popoverSize);

		this._isOpen = true;

		setTimeout(_ => {
			if (this._isOpen) {
				this._dockInterval = setInterval(this.checkDocking.bind(this), dockInterval);
			}
		}, 0);

		setTimeout(_ => {
			if (this._isOpen) {
				document.addEventListener("mousedown", this._documentMouseDownHandler, true);
				document.addEventListener("touchstart", this._documentMouseDownHandler, true);
			}
		}, 0);
	}

	/**
	 * Closes the <code>ui5-popover</code>.
	 * @public
	 */
	close() {
		if (!this._isOpen) {
			return;
		}

		const cancelled = super.close();
		if (cancelled) {
			return;
		}

		this._isOpen = false;

		clearInterval(this._dockInterval);

		document.removeEventListener("mousedown", this._documentMouseDownHandler, true);
		document.removeEventListener("touchstart", this._documentMouseDownHandler, true);

		this.resetFocus();

		RenderScheduler.whenFinished()
			.then(_ => {
				this.fireEvent("afterClose", {});
			});
	}

	getPopoverSize() {
		const popoverFrameDomRef = this.shadowRoot.querySelector(".sapMPopupFrame"); // this.getDomRef();
		const popoverDomRef = popoverFrameDomRef.querySelector(".sapMPopover");

		popoverFrameDomRef.style.visibility = "hidden";
		popoverFrameDomRef.style.display = "block";

		const width = popoverDomRef.offsetWidth;
		const height = popoverDomRef.offsetHeight;

		popoverFrameDomRef.style.display = "";
		popoverFrameDomRef.style.visibility = "visible";

		return {
			width,
			height,
		};
	}

	hasTargetElementMoved() {
		const newRect = this._targetElement.getBoundingClientRect();
		const targetRect = this._targetRect;

		return Math.abs(newRect.left - targetRect.left) > diffTolerance
			|| Math.abs(newRect.top - targetRect.top) > diffTolerance;
	}

	get classes() {
		const placementType = this._actualPlacementType;

		return {
			frame: {
				sapMPopupFrame: true,
				sapMPopupFrameOpen: this._isOpen,
			},
			main: {
				sapMPopup: true,
				sapMPopover: true,
			},
			blockLayer: {
				sapUiBLy: true,
				sapMPopupBlockLayer: true,
				sapMPopupBlockLayerHidden: !this.modal || this._hideBlockLayer,
			},
			arrow: {
				sapMPopoverArr: true,
				sapMPopoverArrHidden: this.noArrow,
				sapMPopoverArrLeft: placementType === PopoverPlacementType.Right,
				sapMPopoverArrRight: placementType === PopoverPlacementType.Left,
				sapMPopoverArrUp: placementType === PopoverPlacementType.Bottom,
				sapMPopoverArrDown: placementType === PopoverPlacementType.Top,
			},
		};
	}

	get styles() {
		return {
			main: {
				left: `${this._left}px`,
				top: `${this._top}px`,
				width: this._width,
				height: this._height,
				"z-index": this._zIndex + 1,
			},
			content: {
				"max-height": `${this._maxContentHeight}px`,
			},
			arrow: {
				transform: `translate(${this._arrowTranslateX}px, ${this._arrowTranslateY}px)`,
			},
			blockLayer: {
				"z-index": this._zIndex,
			},
		};
	}

	get headerId() {
		return this.noHeader ? undefined : `${this._id}-header`;
	}

	get focusHelper() {
		return {
			forwardToLast: this._focusElementsHandlers.forwardToLast,
			forwardToFirst: this._focusElementsHandlers.forwardToFirst,
		};
	}
}

Bootstrap.boot().then(_ => {
	Popover.define();
});

const M_ISO639_OLD_TO_NEW$4 = {
	"iw": "he",
	"ji": "yi",
	"in": "id",
	"sh": "sr",
};

const A_RTL_LOCALES$1 = getDesigntimePropertyAsArray("$cldr-rtl-locales:ar,fa,he$") || [];

const impliesRTL = language => {
	language = (language && M_ISO639_OLD_TO_NEW$4[language]) || language;

	return A_RTL_LOCALES$1.indexOf(language) >= 0;
};

const getEffectiveRTL = () => {
	const configurationRTL = getRTL();

	if (configurationRTL !== null) {
		return !!configurationRTL;
	}

	return impliesRTL(getLanguage() || detectNavigatorLanguage());
};

/**
 * Different types of Button.
 */
const ButtonTypes = {
	/**
	 * default type (no special styling)
	 */
	Default: "Default",

	/**
	 * accept type (green button)
	 */
	Positive: "Positive",

	/**
	 * reject style (red button)
	 */
	Negative: "Negative",

	/**
	 * transparent type
	 */
	Transparent: "Transparent",

	/**
	 * emphasized type
	 */
	Emphasized: "Emphasized",
};

class ButtonDesign extends DataType {
	static isValid(value) {
		return !!ButtonTypes[value];
	}
}

ButtonDesign.generataTypeAcessors(ButtonTypes);

const block0$2 = (context) => { return html`<button		type="button"		class="${ifDefined(classMap(context.classes.main))}"		?disabled="${ifDefined(context.disabled)}"		data-sap-focus-ref				dir="${ifDefined(context.rtl)}"	>		${ context.icon ? block1$1(context) : undefined }${ context.textContent ? block2$1(context) : undefined }</button>`; };
const block1$1 = (context) => { return html`<ui5-icon				class="${ifDefined(classMap(context.classes.icon))}"				src="${ifDefined(context.icon)}"			></ui5-icon>		`; };
const block2$1 = (context) => { return html`<span id="${ifDefined(context._id)}-content" class="${ifDefined(classMap(context.classes.text))}"><bdi><slot></slot></bdi></span>		`; };

var buttonCss = ":host(ui5-button:not([hidden])){display:inline-block}ui5-button:not([hidden]){display:inline-block}button[dir=rtl].sapMBtn.sapMBtnWithIcon .sapMBtnText{margin-right:var(--_ui5_button_base_icon_margin,.375rem);margin-left:0}button[dir=rtl].sapMBtn.sapMBtnIconEnd .sapWCIconInButton{margin-right:var(--_ui5_button_base_icon_margin,.375rem);margin-left:0}button.sapUiSizeCompact .sapWCIconInButton{font-size:1rem}button.sapUiSizeCompact.sapMBtn{padding:var(--_ui5_button_compact_padding,0 .4375rem);min-height:var(--_ui5_button_compact_height,1.625rem);min-width:var(--_ui5_button_base_min_compact_width,2rem)}ui5-button .sapMBtn:before{content:\"\";min-height:inherit;font-size:0}.sapMBtn{width:100%;height:100%;min-width:var(--_ui5_button_base_min_width,2.25rem);min-height:var(--_ui5_button_base_height,2.25rem);font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));font-size:var(--sapMFontMediumSize,.875rem);font-weight:400;box-sizing:border-box;padding:var(--_ui5_button_base_padding,0 .5625rem);border-radius:var(--_ui5_button_border_radius,.25rem);border-width:.0625rem;cursor:pointer;display:flex;justify-content:center;align-items:center;background-color:var(--sapUiButtonBackground,var(--sapButton_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))));border:1px solid var(--sapUiButtonBorderColor,var(--sapButton_BorderColor,#0854a0));color:var(--sapUiButtonTextColor,var(--sapButton_TextColor,#0854a0));text-shadow:var(--sapUiShadowText,0 0 .125rem var(--sapUiContentContrastShadowColor,var(--sapContent_ContrastShadowColor,#fff)));outline:none;position:relative}.sapMBtn:not(.sapMBtnActive):hover{background:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#ebf5fe))}.sapMBtn .sapWCIconInButton{font-size:var(--_ui5_button_base_icon_only_font_size,1rem);position:relative;color:inherit}.sapMBtn.sapMBtnIconEnd{flex-direction:row-reverse}.sapMBtn.sapMBtnIconEnd .sapWCIconInButton{margin-left:var(--_ui5_button_base_icon_margin,.375rem)}.sapMBtn.sapMBtnNoText{padding:var(--_ui5_button_base_icon_only_padding,0 .5625rem)}.sapMBtnText{outline:none;position:relative}.sapMBtn.sapMBtnWithIcon .sapMBtnText{margin-left:var(--_ui5_button_base_icon_margin,.375rem)}.sapMBtnDisabled{opacity:.5;pointer-events:none}.sapMBtn:focus:after{content:\"\";position:absolute;border:var(--_ui5_button_focus_after_border,1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)));top:var(--_ui5_button_focus_after_top,1px);bottom:var(--_ui5_button_focus_after_bottom,1px);left:var(--_ui5_button_focus_after_left,1px);right:var(--_ui5_button_focus_after_right,1px)}.sapMBtn::-moz-focus-inner{border:0}.sapMBtnActive{background-image:none;background-color:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,#0854a0))));border-color:var(--_ui5_button_active_border_color,var(--sapUiButtonActiveBorderColor,var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,#0854a0))))));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtnActive:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapMBtn.sapMBtnPositive{background-color:var(--sapUiButtonAcceptBackground,var(--sapButton_Accept_Background,var(--sapButton_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border-color:var(--_ui5_button_positive_border_color,var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#107e3e)))));color:var(--sapUiButtonAcceptTextColor,#107e3e);text-shadow:var(--sapUiShadowText,0 0 .125rem var(--sapUiContentContrastShadowColor,var(--sapContent_ContrastShadowColor,#fff)))}.sapMBtn.sapMBtnPositive:hover{background-color:var(--sapUiButtonAcceptHoverBackground,var(--sapUiSuccessBG,var(--sapSuccessBackground,#f1fdf6)));border-color:var(--_ui5_button_positive_border_hover_color,var(--sapUiButtonAcceptHoverBorderColor,var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#107e3e))))))}.sapMBtn.sapMBtnPositive.sapMBtnActive{background-color:var(--sapUiButtonAcceptActiveBackground,#0d6733);border-color:var(--_ui5_button_positive_border_active_color,var(--sapUiButtonAcceptActiveBorderColor,var(--sapUiButtonAcceptActiveBackground,#0d6733)));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtn.sapMBtnPositive:focus{border-color:var(--_ui5_button_positive_focus_border_color,var(--sapUiButtonAcceptBorderColor,var(--sapUiPositiveElement,var(--sapPositiveElementColor,var(--sapPositiveColor,#107e3e)))))}.sapMBtn.sapMBtnPositive.sapMBtnActive:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapMBtn.sapMBtnPositive:focus:after{border-color:var(--_ui5_button_positive_border_focus_hover_color,var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)))}.sapMBtn.sapMBtnNegative{background-color:var(--sapUiButtonRejectBackground,var(--sapButton_Reject_Background,var(--sapButton_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border-color:var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00))));color:var(--sapUiButtonRejectTextColor,#b00);text-shadow:var(--sapUiShadowText,0 0 .125rem var(--sapUiContentContrastShadowColor,var(--sapContent_ContrastShadowColor,#fff)))}.sapMBtn.sapMBtnNegative:hover{background-color:var(--sapUiButtonRejectHoverBackground,var(--sapUiErrorBG,var(--sapErrorBackground,#ffebeb)));border-color:var(--sapUiButtonRejectHoverBorderColor,var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00)))))}.sapMBtn.sapMBtnNegative:focus{border-color:var(--_ui5_button_negative_focus_border_color,var(--sapUiButtonRejectBorderColor,var(--sapUiNegativeElement,var(--sapNegativeElementColor,var(--sapNegativeColor,#b00)))))}.sapMBtn.sapMBtnNegative.sapMBtnActive{background-color:var(--sapUiButtonRejectActiveBackground,#a20000);border-color:var(--_ui5_button_negative_active_border_color,var(--sapUiButtonRejectActiveBorderColor,var(--sapUiButtonRejectActiveBackground,#a20000)));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtn.sapMBtnNegative.sapMBtnActive:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapMBtn.sapMBtnNegative:focus:after{border-color:var(--_ui5_button_positive_border_focus_hover_color,var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)))}.sapMBtn.sapMBtnEmphasized{background-color:var(--sapUiButtonEmphasizedBackground,var(--sapButton_Emphasized_Background,var(--sapBrandColor,var(--sapPrimary2,#0a6ed1))));border-color:var(--sapUiButtonEmphasizedBorderColor,var(--sapButton_Emphasized_BorderColor,var(--sapButton_Emphasized_Background,var(--sapBrandColor,var(--sapPrimary2,#0a6ed1)))));color:var(--sapUiButtonEmphasizedTextColor,var(--sapButton_Emphasized_TextColor,#fff));text-shadow:0 0 .125rem var(--sapUiButtonEmphasizedTextShadow,transparent);font-weight:var(--_ui5_button_emphasized_font_weight,bold)}.sapMBtn.sapMBtnEmphasized:hover{background-color:var(--sapUiButtonEmphasizedHoverBackground,#085caf);border-color:var(--sapUiButtonEmphasizedHoverBorderColor,var(--sapUiButtonEmphasizedHoverBackground,#085caf))}.sapMBtn.sapMBtnEmphasized.sapMBtnActive{background-color:var(--sapUiButtonEmphasizedActiveBackground,#0854a0);border-color:var(--sapUiButtonEmphasizedActiveBorderColor,var(--sapUiButtonEmphasizedActiveBackground,#0854a0));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtn.sapMBtnEmphasized.sapMBtnActive:focus:after,.sapMBtn.sapMBtnEmphasized:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapMBtn.sapMBtnEmphasized:focus{border-color:var(--_ui5_button_emphasized_focused_border_color,var(--sapUiButtonEmphasizedBorderColor,var(--sapButton_Emphasized_BorderColor,var(--sapButton_Emphasized_Background,var(--sapBrandColor,var(--sapPrimary2,#0a6ed1))))))}.sapMBtn.sapMBtnTransparent{background-color:var(--sapUiButtonLiteBackground,transparent);border-color:var(--sapUiButtonLiteBorderColor,transparent);color:var(--sapUiButtonLiteTextColor,var(--sapUiButtonTextColor,var(--sapButton_TextColor,#0854a0)));text-shadow:var(--sapUiShadowText,0 0 .125rem var(--sapUiContentContrastShadowColor,var(--sapContent_ContrastShadowColor,#fff)));border-color:transparent}.sapMBtn.sapMBtnTransparent:hover{background-color:var(--sapUiButtonLiteHoverBackground,var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#ebf5fe)))}.sapMBtn.sapMBtnTransparent.sapMBtnActive{background-color:var(--sapUiButtonLiteActiveBackground,var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,#0854a0)))));color:var(--sapUiButtonActiveTextColor,#fff);text-shadow:none}.sapMBtn.sapMBtnTransparent:hover:not(.sapMBtnActive){border-color:transparent}";

/**
 * @public
 */
const metadata$4 = {
	tag: "ui5-button",
	properties: /** @lends sap.ui.webcomponents.main.Button.prototype */ {

		/**
		 * Defines the <code>ui5-button</code> design.
		 * </br></br>
		 * <b>Note:</b> Available options are "Default", "Emphasized", "Positive",
		 * "Negative", and "Transparent".
		 *
		 * @type {ButtonDesign}
		 * @defaultvalue "Default"
		 * @public
		 */
		design: {
			type: ButtonDesign,
			defaultValue: ButtonDesign.Default,
		},

		/**
		 * Defines whether the <code>ui5-button</code> is disabled
		 * (default is set to <code>false</code>).
		 * A disabled <code>ui5-button</code> can't be pressed or
		 * focused, and it is not in the tab chain.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		disabled: {
			type: Boolean,
		},

		/**
		 * Defines the icon to be displayed as graphical element within the <code>ui5-button</code>.
		 * The SAP-icons font provides numerous options.
		 * <br><br>
		 * Example:
		 * <br>
		 * <pre>ui5-button icon="sap-icon://palette"</pre>
		 *
		 * See all the available icons in the <ui5-link target="_blank" href="https://openui5.hana.ondemand.com/test-resources/sap/m/demokit/iconExplorer/webapp/index.html" class="api-table-content-cell-link">Icon Explorer</ui5-link>.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		icon: {
			type: String,
		},

		/**
		 * Defines whether the icon should be displayed after the <code>ui5-button</code> text.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		iconEnd: {
			type: Boolean,
		},

		/**
		 * When set to <code>true</code>, the <code>ui5-button</code> will
		 * automatically submit the nearest form element upon <code>press</code>.
		 *
		 * <b>Important:</b> For the <code>submits</code> property to have effect, you must add the following import to your project:
		 * <code>import InputElementsFormSupport from "@ui5/webcomponents/dist/InputElementsFormSupport";</code>
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		submits: {
			type: Boolean,
		},

		/**
		 * Used to switch the active state (pressed or not) of the <code>ui5-button</code>.
		 */
		_active: {
			type: Boolean,
		},

		_iconSettings: {
			type: Object,
		},
	},
	slots: /** @lends sap.ui.webcomponents.main.Button.prototype */ {
		/**
		 * Defines the text of the <code>ui5-button</code>.
		 * <br><b>Note:</b> Аlthough this slot accepts HTML Elements, it is strongly recommended that you only use text in order to preserve the intended design.
		 *
		 * @type {Node[]}
		 * @slot
		 * @public
		 */
		text: {
			type: Node,
			multiple: true,
		},
	},
	defaultSlot: "text",
	events: /** @lends sap.ui.webcomponents.main.Button.prototype */ {

		/**
		 * Fired when the <code>ui5-button</code> is pressed either with a
		 * click/tap or by using the Enter or Space key.
		 * <br><br>
		 * <b>Note:</b> The event will not be fired if the <code>disabled</code>
		 * property is set to <code>true</code>.
		 *
		 * @event
		 * @public
		 */
		press: {},
	},
};

/**
 * @class
 *
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-button</code> component represents a simple push button.
 * It enables users to trigger actions by clicking or tapping the <code>ui5-button</code>, or by pressing
 * certain keyboard keys, such as Enter.
 *
 *
 * <h3>Usage</h3>
 *
 * For the <code>ui5-button</code> UI, you can define text, icon, or both. You can also specify
 * whether the text or the icon is displayed first.
 * <br><br>
 * You can choose from a set of predefined types that offer different
 * styling to correspond to the triggered action.
 * <br><br>
 * You can set the <code>ui5-button</code> as enabled or disabled. An enabled
 * <code>ui5-button</code> can be pressed by clicking or tapping it. The button changes
 * its style to provide visual feedback to the user that it is pressed or hovered over with
 * the mouse cursor. A disabled <code>ui5-button</code> appears inactive and cannot be pressed.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/Button";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Button
 * @extends UI5Element
 * @tagname ui5-button
 * @public
 */
class Button extends UI5Element {
	static get metadata() {
		return metadata$4;
	}

	static get styles() {
		return buttonCss;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$2;
	}

	constructor() {
		super();

		this._deactivate = () => {
			if (this._active) {
				this._active = false;
			}
		};
	}

	onBeforeRendering() {
		const FormSupport = getFeature("FormSupport");
		if (this.submits && !FormSupport) {
			console.warn(`In order for the "submits" property to have effect, you should also: import InputElementsFormSupport from "@ui5/webcomponents/dist/InputElementsFormSupport";`); // eslint-disable-line
		}
	}

	onEnterDOM() {
		document.addEventListener("mouseup", this._deactivate);
	}

	onExitDOM() {
		document.removeEventListener("mouseup", this._deactivate);
	}

	onclick(event) {
		event.isMarked = "button";
		if (!this.disabled) {
			this.fireEvent("press", {});
			const FormSupport = getFeature("FormSupport");
			if (FormSupport) {
				FormSupport.triggerFormSubmit(this);
			}
		}
	}

	onmousedown(event) {
		event.isMarked = "button";

		if (!this.disabled) {
			this._active = true;
		}
	}

	onmouseup(event) {
		event.isMarked = "button";
	}

	onkeydown(event) {
		if (isSpace(event) || isEnter(event)) {
			this._active = true;
		}
	}

	onkeyup(event) {
		if (isSpace(event) || isEnter(event)) {
			this._active = false;
		}
	}

	onfocusout(_event) {
		this._active = false;
	}

	get classes() {
		return {
			main: {
				sapMBtn: true,
				sapMBtnActive: this._active,
				sapMBtnWithIcon: this.icon,
				sapMBtnNoText: !this.text.length,
				sapMBtnDisabled: this.disabled,
				sapMBtnIconEnd: this.iconEnd,
				[`sapMBtn${this.design}`]: true,
				sapUiSizeCompact: getCompactSize(),
			},
			icon: {
				sapWCIconInButton: true,
			},
			text: {
				sapMBtnText: true,
			},
		};
	}

	get rtl() {
		return getEffectiveRTL() ? "rtl" : undefined;
	}

	static async define(...params) {
		await Icon.define();

		super.define(...params);
	}
}

Bootstrap.boot().then(_ => {
	Button.define();
});

const block0$3 = (context) => { return html`<div	class="${ifDefined(classMap(context.classes.main))}"	dir="${ifDefined(context.rtl)}"><ui5-icon id="${ifDefined(context._id)}-btnPrev"		class="${ifDefined(classMap(context.classes.buttons))}"		src="${ifDefined(context._btnPrev.icon)}"		data-sap-cal-head-button="Prev"></ui5-icon><div class="sapWCCalHeadMidButtonContainer"><div			id="${ifDefined(context._id)}-btn1"			class="${ifDefined(classMap(context.classes.middleButtons))}"			type="${ifDefined(context._btn1.type)}"			tabindex="0"			data-sap-show-picker="Month"		>			${ifDefined(context._btn1.text)}</div><div			id="${ifDefined(context._id)}-btn2"			class="${ifDefined(classMap(context.classes.middleButtons))}"			type="${ifDefined(context._btn2.type)}"			tabindex="0"			data-sap-show-picker="Year"		>			${ifDefined(context._btn2.text)}</div></div><ui5-icon		id="${ifDefined(context._id)}-btnNext"		class="${ifDefined(classMap(context.classes.buttons))}"		src="${ifDefined(context._btnNext.icon)}"		data-sap-cal-head-button="Next"></ui5-icon></div>`; };

var styles$1 = ":host(ui5-calendar-header){display:inline-block;width:100%}ui5-calendar-header{display:inline-block;width:100%}.sapWCCalHead{display:flex;height:3rem;padding:.25rem 0;box-sizing:border-box}.sapWCCalHead ui5-button{height:100%}.sapWCCalHeadArrowButton{display:flex;justify-content:center;align-items:center;width:2.5rem;background-color:var(--sapUiButtonLiteBackground,transparent);color:var(--sapUiButtonTextColor,var(--sapButton_TextColor,#0854a0));cursor:pointer;overflow:hidden;white-space:nowrap;padding:0;font-size:var(--sapMFontMediumSize,.875rem)}.sapWCCalHeadArrowButton:focus{outline:none}.sapWCCalHeadArrowButton:hover{background-color:var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#ebf5fe));color:var(--sapUiButtonHoverTextColor,var(--sapButton_Hover_TextColor,#0854a0))}.sapWCCalHeadArrowButton:active{background-color:var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,#0854a0))));color:var(--sapUiButtonActiveTextColor,#fff)}.sapWCCalHeadArrowButton,.sapWCCalHeadMiddleButton{border:var(--_ui5_calendar_header_arrow_button_border,none);border-radius:var(--_ui5_calendar_header_arrow_button_border_radius,.25rem)}.sapWCCalHeadMidButtonContainer{display:flex;justify-content:space-around;flex:1;padding:0 .5rem}.sapWCCalHeadMidButtonContainer .sapWCCalHeadMiddleButton:first-child{margin-right:.5rem}.sapWCCalHeadMiddleButton{font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));width:var(--_ui5_calendar_header_middle_button_width,2.5rem);flex:var(--_ui5_calendar_header_middle_button_flex,1);position:relative;box-sizing:border-box;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.sapWCCalHeadMiddleButton:focus{border:var(--_ui5_calendar_header_middle_button_focus_border,none);border-radius:var(--_ui5_calendar_header_middle_button_focus_border_radius,.25rem)}.sapWCCalHeadMiddleButton:focus:after{content:\"\";display:var(--_ui5_calendar_header_middle_button_focus_after_display,block);width:var(--_ui5_calendar_header_middle_button_focus_after_width,calc(100% - .375rem));height:var(--_ui5_calendar_header_middle_button_focus_after_height,calc(100% - .375rem));border:1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));position:absolute;top:var(--_ui5_calendar_header_middle_button_focus_after_top_offset,.125rem);left:var(--_ui5_calendar_header_middle_button_focus_after_left_offset,.125rem)}.sapWCCalHeadMiddleButton:focus:active:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapUiSizeCompact.sapWCCalHead{height:2rem;padding:0}.sapUiSizeCompact.sapWCCalHeadArrowButton{width:2rem}[dir=rtl] .sapWCCalHeadMidButtonContainer .sapWCCalHeadMiddleButton:first-child{margin-left:.5rem;margin-right:0}";

const metadata$5 = {
	tag: "ui5-calendar-header",
	properties: {
		monthText: {
			type: String,
		},
		yearText: {
			type: String,
		},
		_btnPrev: {
			type: Object,
		},
		_btnNext: {
			type: Object,
		},
		_btn1: {
			type: Object,
		},
		_btn2: {
			type: Object,
		},
	},
	events: {
		pressPrevious: {},
		pressNext: {},
		btn1Press: {},
		btn2Press: {},
	},
};

class CalendarHeader extends UI5Element {
	static get metadata() {
		return metadata$5;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$3;
	}

	static get styles() {
		return styles$1;
	}

	constructor() {
		super();
		this._btnPrev = {};
		this._btnPrev.icon = "sap-icon://slim-arrow-left";

		this._btnNext = {};
		this._btnNext.icon = "sap-icon://slim-arrow-right";

		this._btn1 = {};
		this._btn1.type = ButtonDesign.Transparent;

		this._btn2 = {};
		this._btn2.type = ButtonDesign.Transparent;
	}

	onBeforeRendering() {
		this._btn1.text = this.monthText;
		this._btn2.text = this.yearText;
	}

	_handlePrevPress(event) {
		this.fireEvent("pressPrevious", event);
	}

	_handleNextPress(event) {
		this.fireEvent("pressNext", event);
	}

	_showMonthPicker(event) {
		this.fireEvent("btn1Press", event);
	}

	_showYearPicker(event) {
		this.fireEvent("btn2Press", event);
	}

	onclick(event) {
		const composedPath = event.composedPath();

		for (let index = 0; index < composedPath.length; index++) {
			const sAttributeValue = composedPath[index].getAttribute && composedPath[index].getAttribute("data-sap-cal-head-button");
			const showPickerButton = event.ui5target.getAttribute("data-sap-show-picker");

			if (showPickerButton) {
				this[`_show${showPickerButton}Picker`]();
				return;
			}

			if (sAttributeValue) {
				this[`_handle${sAttributeValue}Press`]();
				return;
			}
		}
	}

	onkeydown(event) {
		if (isSpace(event) || isEnter(event)) {
			const showPickerButton = event.ui5target.getAttribute("data-sap-show-picker");

			if (showPickerButton) {
				this[`_show${showPickerButton}Picker`]();
			}
		}
	}

	get classes() {
		return {
			main: {
				sapWCCalHead: true,
				sapUiSizeCompact: getCompactSize(),
			},
			buttons: {
				sapWCCalHeadArrowButton: true,
			},
			middleButtons: {
				sapWCCalHeadMiddleButton: true,
				sapWCCalHeadArrowButton: true,
			},
		};
	}

	get rtl() {
		return getEffectiveRTL() ? "rtl" : undefined;
	}

	static async define(...params) {
		await Button.define();

		super.define(...params);
	}
}

Bootstrap.boot().then(_ => {
	CalendarHeader.define();
});

class EventProvider {
	constructor() {
		this._eventRegistry = {};
	}

	attachEvent(eventName, fnFunction) {
		const eventRegistry = this._eventRegistry;
		let eventListeners = eventRegistry[eventName];

		if (!Array.isArray(eventListeners)) {
			eventRegistry[eventName] = [];
			eventListeners = eventRegistry[eventName];
		}

		eventListeners.push({
			"function": fnFunction,
		});
	}

	detachEvent(eventName, fnFunction) {
		const eventRegistry = this._eventRegistry;
		const eventListeners = eventRegistry[eventName];

		if (!eventListeners) {
			return;
		}

		for (let i = 0; i < eventListeners.length; i++) {
			const event = eventListeners[i];
			if (event["function"] === fnFunction) { // eslint-disable-line
				eventListeners.splice(i, 1);
			}
		}

		if (eventListeners.length === 0) {
			delete eventRegistry[eventName];
		}
	}

	fireEvent(eventName, data) {
		const eventRegistry = this._eventRegistry;
		const eventListeners = eventRegistry[eventName];

		if (!eventListeners) {
			return;
		}

		eventListeners.forEach(event => {
			event["function"].call(this, data); // eslint-disable-line
		});
	}

	isHandlerAttached(eventName, fnFunction) {
		const eventRegistry = this._eventRegistry;
		const eventListeners = eventRegistry[eventName];

		if (!eventListeners) {
			return false;
		}

		for (let i = 0; i < eventListeners.length; i++) {
			const event = eventListeners[i];
			if (event["function"] === fnFunction) { // eslint-disable-line
				return true;
			}
		}

		return false;
	}

	hasListeners(eventName) {
		return !!this._eventRegistry[eventName];
	}
}

// navigatable items must have id and tabindex
class ItemNavigation extends EventProvider {
	constructor(rootWebComponent, options = {}) {
		super();

		this.currentIndex = options.currentIndex || 0;
		this.rowSize = options.rowSize || 1;
		this.cyclic = options.cyclic || false;

		this.rootWebComponent = rootWebComponent;
	}

	init() {
		this._getItems().forEach((item, idx) => {
			item._tabIndex = (idx === this.currentIndex) ? "0" : "-1";
		});
	}

	_onKeyPress(event) {
		const items = this._getItems();

		if (this.currentIndex >= items.length) {
			if (!this.cyclic) {
				this.fireEvent(ItemNavigation.BORDER_REACH, { start: false, end: true, offset: this.currentIndex });
			}

			this.currentIndex = this.currentIndex - items.length;
		} else if (this.currentIndex < 0) {
			if (!this.cyclic) {
				this.fireEvent(ItemNavigation.BORDER_REACH, { start: true, end: false, offset: this.currentIndex });
			}

			this.currentIndex = items.length + this.currentIndex;
		}

		this.update();
		this.focusCurrent();

		// stops browser scrolling with up/down keys
		event.stopPropagation();
		event.stopImmediatePropagation();
		event.preventDefault();
	}

	onkeydown(event) {
		if (isUp(event)) {
			return this._handleUp(event);
		}

		if (isDown(event)) {
			return this._handleDown(event);
		}

		if (isLeft(event)) {
			return this._handleLeft(event);
		}

		if (isRight(event)) {
			return this._handleRight(event);
		}

		if (isHome(event)) {
			return this._handleHome(event);
		}

		if (isEnd(event)) {
			return this._handleEnd(event);
		}
	}

	_handleUp(event) {
		if (this._canNavigate()) {
			this.currentIndex -= this.rowSize;
			this._onKeyPress(event);
		}
	}

	_handleDown(event) {
		if (this._canNavigate()) {
			this.currentIndex += this.rowSize;
			this._onKeyPress(event);
		}
	}

	_handleLeft(event) {
		if (this._canNavigate()) {
			this.currentIndex -= 1;
			this._onKeyPress(event);
		}
	}

	_handleRight(event) {
		if (this._canNavigate()) {
			this.currentIndex += 1;
			this._onKeyPress(event);
		}
	}

	_handleHome(event) {
		if (this._canNavigate()) {
			const homeEndRange = this.rowSize > 1 ? this.rowSize : this._getItems().length;
			this.currentIndex -= this.currentIndex % homeEndRange;
			this._onKeyPress(event);
		}
	}

	_handleEnd(event) {
		if (this._canNavigate()) {
			const homeEndRange = this.rowSize > 1 ? this.rowSize : this._getItems().length;
			this.currentIndex += (homeEndRange - 1 - this.currentIndex % homeEndRange); // eslint-disable-line
			this._onKeyPress(event);
		}
	}

	update(current) {
		const origItems = this._getItems();

		if (current) {
			this.currentIndex = this._getItems().indexOf(current);
		}

		if (!origItems[this.currentIndex]
			|| (origItems[this.currentIndex]._tabIndex && origItems[this.currentIndex]._tabIndex === "0")) {
			return;
		}

		const items = origItems.slice(0);

		for (let i = 0; i < items.length; i++) {
			items[i]._tabIndex = (i === this.currentIndex ? "0" : "-1");
		}

		if (this._setItems) {
			this._setItems(items);
		}
	}

	focusCurrent() {
		const currentItem = this._getCurrentItem();
		if (currentItem) {
			currentItem.focus();
		}
	}

	_canNavigate() {
		const currentItem = this._getCurrentItem();

		let activeElement = document.activeElement;

		while (activeElement.shadowRoot && activeElement.shadowRoot.activeElement) {
			activeElement = activeElement.shadowRoot.activeElement;
		}

		return currentItem && currentItem === activeElement;
	}

	_getCurrentItem() {
		const items = this._getItems();

		if (!items.length) {
			return null;
		}

		// normalize the index
		while (this.currentIndex >= items.length) {
			this.currentIndex -= this.rowSize;
		}

		if (this.currentIndex < 0) {
			this.currentIndex = 0;
		}

		const currentItem = items[this.currentIndex];

		if (currentItem instanceof UI5Element) {
			return currentItem.getFocusDomRef();
		}

		if (!this.rootWebComponent.getDomRef()) {
			return;
		}

		return this.rootWebComponent.getDomRef().querySelector(`#${currentItem.id}`);
	}

	set setItemsCallback(fn) {
		this._setItems = fn;
	}

	set getItemsCallback(fn) {
		this._getItems = fn;
	}

	set current(val) {
		this.currentIndex = val;
	}
}

ItemNavigation.BORDER_REACH = "_borderReach";

const calculateWeekNumber = (oDate, iYear, oLocale, oLocaleData) => {
	let iWeekNum = 0;
	let iWeekDay = 0;
	const iFirstDayOfWeek = oLocaleData.getFirstDayOfWeek();

	// search Locale for containing "en-US", since sometimes
	// when any user settings have been defined, subtag "sapufmt" is added to the locale name
	// this is described inside sap.ui.core.Configuration file
	if (oLocale && (oLocale.getLanguage() === "en" && oLocale.getRegion() === "US")) {
		/*
			* in US the week starts with Sunday
			* The first week of the year starts with January 1st. But Dec. 31 is still in the last year
			* So the week beginning in December and ending in January has 2 week numbers
			*/
		const oJanFirst = new UniversalDate(oDate.getTime());
		oJanFirst.setUTCFullYear(iYear, 0, 1);
		iWeekDay = oJanFirst.getUTCDay();

		// get the date for the same weekday like jan 1.
		const oCheckDate = new UniversalDate(oDate.getTime());
		oCheckDate.setUTCDate(oCheckDate.getUTCDate() - oCheckDate.getUTCDay() + iWeekDay);

		iWeekNum = Math.round((oCheckDate.getTime() - oJanFirst.getTime()) / 86400000 / 7) + 1;
	} else {
		// normally the first week of the year is the one where the first Thursday of the year is
		// find Thursday of this week
		// if the checked day is before the 1. day of the week use a day of the previous week to check
		const oThursday = new UniversalDate(oDate.getTime());
		oThursday.setUTCDate(oThursday.getUTCDate() - iFirstDayOfWeek);
		iWeekDay = oThursday.getUTCDay();
		oThursday.setUTCDate(oThursday.getUTCDate() - iWeekDay + 4);

		const oFirstDayOfYear = new UniversalDate(oThursday.getTime());
		oFirstDayOfYear.setUTCMonth(0, 1);
		iWeekDay = oFirstDayOfYear.getUTCDay();
		let iAddDays = 0;
		if (iWeekDay > 4) {
			iAddDays = 7; // first day of year is after Thursday, so first Thursday is in the next week
		}
		const oFirstThursday = new UniversalDate(oFirstDayOfYear.getTime());
		oFirstThursday.setUTCDate(1 - iWeekDay + 4 + iAddDays);

		iWeekNum = Math.round((oThursday.getTime() - oFirstThursday.getTime()) / 86400000 / 7) + 1;
	}

	return iWeekNum;
};

const block0$4 = (context) => { return html`<div class="${ifDefined(classMap(context.classes.wrapper))}" style="${ifDefined(styleMap$1(context.styles.wrapper))}"><div class="${ifDefined(classMap(context.classes.weekNumberContainer))}">		${ repeat(context._weekNumbers, undefined, (item, index) => block1$2(item, index, context)) }</div><div id="${ifDefined(context._id)}-content" class="${ifDefined(classMap(context.classes.content))}"><div role="row" class="${ifDefined(classMap(context.classes.weekDaysContainer))}">			${ repeat(context._dayNames, undefined, (item, index) => block2$2(item, index, context)) }</div><div id="${ifDefined(context._id)}-days" class="sapWCDayPickerItemsContainer" tabindex="-1">			${ repeat(context._weeks, undefined, (item, index) => block3$1(item, index, context)) }</div></div></div>`; };
const block1$2 = (item, index, context) => { return html`<div class="sapWCDayPickerWeekNameContainer"><span class="sapWCDayPickerWeekName">${ifDefined(item)}</span></div>		`; };
const block2$2 = (item, index, context) => { return html`<div					id=${ifDefined(item._id)}					role="columnheader"					aria-label="${ifDefined(item.name)}"					class="${ifDefined(item.classes)}">					${ifDefined(item.ultraShortName)}</div>			`; };
const block3$1 = (item, index, context) => { return html`${ item.length ? block4$1(item, index, context) : block6(item, index, context) }`; };
const block4$1 = (item, index, context) => { return html`<div style="display: flex;">						${ repeat(item, undefined, (item, index) => block5(item, index, context)) }</div>				`; };
const block5 = (item, index, context) => { return html`<div								id="${ifDefined(item.id)}"								tabindex="${ifDefined(item._tabIndex)}"								data-sap-timestamp="${ifDefined(item.timestamp)}"								data-sap-index="${ifDefined(item._index)}"								role="gridcell"								aria-selected="${ifDefined(item.selected)}"								class="${ifDefined(item.classes)}"><span 										class="sapWCDayPickerDayText"										data-sap-timestamp="${ifDefined(item.timestamp)}"										data-sap-index="${ifDefined(item._index)}">											${ifDefined(item.iDay)}</span></div>						`; };
const block6 = (item, index, context) => { return html`<div class="sapWCEmptyWeek"></div>				`; };

var dayPickerCSS = ":host(ui5-daypicker){display:inline-block;height:100%;width:100%}ui5-daypicker{display:inline-block;height:100%;width:100%}.sapWCDayPickerDayName,.sapWCDayPickerItem,.sapWCDayPickerWeekName{width:2.25rem;height:2.875rem;margin-top:var(--_ui5_daypicker_item_margin,2px);margin-right:var(--_ui5_daypicker_item_margin,2px);font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));border-radius:var(--_ui5_daypicker_item_border_radius,.25rem)}.sapWCDayPickerWeekName{color:var(--_ui5_daypicker_weekname_color,var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapPrimary7,#6a6d70))))}.sapWCDayPickerContent{display:flex;flex-direction:column;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif))}.sapWCDayPickerDaysNamesContainer{display:flex;height:var(--_ui5_daypicker_daynames_container_height,2rem)}.sapWCDayPickerWeekNumberContainer{padding-top:var(--_ui5_daypicker_weeknumbers_container_padding_top,2rem)}.sapWCDayPickerDayName,.sapWCDayPickerItem,.sapWCDayPickerWeekName,.sapWCDayPickerWeekNameContainer{display:flex;justify-content:center;align-items:center;font-size:var(--sapMFontSmallSize,.75rem);outline:none;box-sizing:border-box;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.sapWCDayPickerItem{position:relative;color:var(--sapUiBaseText,var(--sapTextColor,var(--sapPrimary6,#32363a)));background:var(--_ui5_daypicker_item_background_color,var(--sapUiListBackgroundDarken3,#f7f7f7));font-size:var(--sapMFontMediumSize,.875rem);border:var(--_ui5_daypicker_item_border,none)}.sapWCDayPickerItem:hover{background:var(--_ui5_daypicker_item_hover_background_color,var(--sapUiListBackgroundDarken15,#d9d9d9))}.sapWCDayPickerDayText{display:flex;width:100%;height:100%;justify-content:center;align-items:center;box-sizing:border-box}.sapWCDayPickerDayName{color:var(--_ui5_daypicker_dayname_color,var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapPrimary7,#6a6d70))));height:100%}.sapWCDayPickerItem.sapWCDayPickerItemWeekEnd{background:var(--_ui5_daypicker_item_weekend_background_color,var(--sapUiListBackgroundDarken13,#dedede))}.sapWCDayPickerItem.sapWCDayPickerItemWeekEnd:hover{background:var(--_ui5_daypicker_item_weekend_hover_background_color,var(--sapUiListBackgroundDarken20,#ccc))}.sapWCDayPickerItem.sapWCDayPickerItemOtherMonth{color:var(--_ui5_daypicker_item_othermonth_color,var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapPrimary7,#6a6d70))));background:var(--_ui5_daypicker_item_othermonth_background_color,var(--sapUiListBackground,var(--sapList_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border-color:transparent}.sapWCDayPickerItem.sapWCDayPickerItemOtherMonth:hover,.sapWCDayPickerItem.sapWCDayPickerItemWeekEnd.sapWCDayPickerItemOtherMonth:hover{color:var(--_ui5_daypicker_item_othermonth_hover_color,var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapPrimary7,#6a6d70))));background:var(--_ui5_daypicker_item_othermonth_hover_background_color,var(--sapUiListBackgroundDarken10,#e6e6e6))}.sapWCDayPickerItem:focus:after{content:\"\";width:calc(100% - .25rem);height:calc(100% - .25rem);border:var(--_ui5_daypicker_item_outline_width,1px) dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));position:absolute;top:var(--_ui5_daypicker_item_outline_offset,1px);left:var(--_ui5_daypicker_item_outline_offset,1px)}.sapWCDayPickerItem.sapWCDayPickerItemNow{border:.125rem solid var(--sapUiCalendarColorToday,var(--sapUiAccent4,var(--sapAccentColor4,#c0399f)))}.sapWCDayPickerItem.sapWCDayPickerItemSel .sapWCDayPickerDayText{background:var(--_ui5_daypicker_item_selected_background_color,var(--sapUiActiveLighten3,#095caf));color:var(--sapUiContentContrastTextColor,var(--sapContent_ContrastTextColor,#fff))}.sapWCDayPickerItem.sapWCDayPickerItemSel.sapWCDayPickerItemNow .sapWCDayPickerDayText{border:1px solid var(--_ui5_daypicker_item_now_selected_text_border_color,var(--sapUiListBorderColorLighten10,#fff));border-radius:var(--_ui5_daypicker_item_now_inner_border_radius,.125rem)}.sapWCDayPickerItem.sapWCDayPickerItemSel.sapWCDayPickerItemNow:focus:after{width:var(--_ui5_daypicker_item_now_selected_focus_after_width,calc(100% - .125rem));height:var(--_ui5_daypicker_item_now_selected_focus_after_height,calc(100% - .125rem));border-color:var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));top:0;left:0}.sapWCDayPickerItem.sapWCDayPickerItemSel:hover{background:var(--_ui5_daypicker_item_selected_hover_background_color,var(--sapUiActiveLighten3,#095caf));color:var(--sapUiContentContrastTextColor,var(--sapContent_ContrastTextColor,#fff))}.sapWCDayPickerItem.sapWCDayPickerItemSel:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapWCDayPickerItemsContainer{outline:none}.sapWCDayPickerItemsContainer>:first-child{justify-content:flex-end}.sapWCEmptyWeek{height:3rem}.sapUiSizeCompact .sapWCDayPickerWeekNumberContainer{padding-top:2rem}.sapUiSizeCompact .sapWCDayPickerDayName,.sapUiSizeCompact .sapWCDayPickerItem,.sapUiSizeCompact .sapWCDayPickerWeekName{width:2rem;height:2rem}.sapUiSizeCompact .sapWCEmptyWeek{height:2.125rem}";

/**
 * @public
 */
const metadata$6 = {
	tag: "ui5-daypicker",
	properties: /** @lends  sap.ui.webcomponents.main.DayPicker.prototype */ {
		/**
		 * A UNIX timestamp - seconds since 00:00:00 UTC on Jan 1, 1970.
		 * @type {number}
		 * @public
		 */
		timestamp: {
			type: Integer,
		},

		/**
		 * Sets a calendar type used for display.
		 * If not set, the calendar type of the global configuration is used.
		 * @type {string}
		 * @public
		 */
		primaryCalendarType: {
			type: CalendarType$1,
		},

		/**
		 * Sets the selected dates as UTC timestamps.
		 * @type {Array}
		 * @public
		 */
		selectedDates: {
			type: Integer,
			multiple: true,
			deepEqual: true,
		},

		_weeks: {
			type: Object,
			multiple: true,
		},

		_weekNumbers: {
			type: Object,
			multiple: true,
		},

		_dayNames: {
			type: Object,
			multiple: true,
			nonVisual: true,
		},
		_hidden: {
			type: Boolean,
		},
	},
	events: /** @lends  sap.ui.webcomponents.main.DayPicker.prototype */ {
		/**
		 * Fired when the user selects a new Date on the Web Component.
		 * @public
		 * @event
		 */
		selectionChange: {},
		/**
		 * Fired when month, year has changed due to item navigation.
		 * @public
		 * @event
		 */
		navigate: {},
	},
};

const MAX_YEAR = 9999;
const MIN_YEAR = 1;

/**
 * @class
 *
 * Represents one month view inside a calendar.
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.DayPicker
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-daypicker
 * @public
 */
class DayPicker extends UI5Element {
	static get metadata() {
		return metadata$6;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$4;
	}

	static get styles() {
		return dayPickerCSS;
	}

	constructor() {
		super();
		this._oLocale = getFormatLocale();
		this._oLocaleData = new LocaleData(this._oLocale);

		this._itemNav = new ItemNavigation(this, { rowSize: 7 });
		this._itemNav.getItemsCallback = function getItemsCallback() {
			return [].concat(...this._weeks);
		}.bind(this);

		this._itemNav.attachEvent(
			ItemNavigation.BORDER_REACH,
			this._handleItemNavigationBorderReach.bind(this)
		);

		this._delegates.push(this._itemNav);
	}

	onBeforeRendering() {
		let oCalDate,
			day,
			timestamp,
			lastWeekNumber = -1,
			isDaySelected = false,
			todayIndex = 0;

		const _aVisibleDays = this._getVisibleDays(this._calendarDate);

		this._weeks = [];
		let week = [];
		this._weekNumbers = [];
		let weekday;

		/* eslint-disable no-loop-func */
		for (let i = 0; i < _aVisibleDays.length; i++) {
			oCalDate = _aVisibleDays[i];
			timestamp = oCalDate.valueOf() / 1000; // no need to round because CalendarDate does it

			// day of the week
			weekday = oCalDate.getDay() - this._getFirstDayOfWeek();
			if (weekday < 0) {
				weekday += 7;
			}
			day = {
				timestamp: timestamp.toString(),
				selected: this._selectedDates.some(d => {
					return d === timestamp;
				}),
				iDay: oCalDate.getDate(),
				_index: i.toString(),
				classes: `sapWCDayPickerItem sapWCDayPickerWDay${weekday}`,
			};

			const weekNumber = calculateWeekNumber(oCalDate.toUTCJSDate(), oCalDate.getYear(), this._oLocale, this._oLocaleData);

			if (lastWeekNumber !== weekNumber) {
				this._weekNumbers.push(weekNumber);

				lastWeekNumber = weekNumber;
			}

			const isToday = (oCalDate.getDate() === this._currentCalendarDate.getDate())
				&& (oCalDate.getMonth() === this._currentCalendarDate.getMonth())
				&& (oCalDate.getYear() === this._currentCalendarDate.getYear());

			week.push(day);

			if (oCalDate.getDay() === this._getFirstDayOfWeek()) {
				day.classes += " sapWCDayPickerFirstWDay";
			}

			if (day.selected) {
				day.classes += " sapWCDayPickerItemSel";
				isDaySelected = true;
			}

			if (isToday) {
				day.classes += " sapWCDayPickerItemNow";
				todayIndex = i;
			}

			if (oCalDate.getMonth() !== this._month) {
				day.classes += " sapWCDayPickerItemOtherMonth";
			}

			day.id = `${this._id}-${timestamp}`;

			if (this._isWeekend(oCalDate)) {
				day.classes += " sapWCDayPickerItemWeekEnd";
			}

			if (day.classes.indexOf("sapWCDayPickerWDay6") !== -1
				|| _aVisibleDays.length - 1 === i) {
				this._weeks.push(week);
				week = [];
			}
		}

		while (this._weeks.length < 6) {
			this._weeks.push([]);
		}
		/* eslint-enable no-loop-func */

		if (!isDaySelected && todayIndex && this._itemNav.current === 0) {
			this._itemNav.current = todayIndex;
		}

		this._itemNav.init();

		const aDayNamesWide = this._oLocaleData.getDays("wide", this._primaryCalendarType);
		const aDayNamesAbbreviated = this._oLocaleData.getDays("abbreviated", this._primaryCalendarType);
		const aUltraShortNames = aDayNamesAbbreviated.map(n => n);
		let dayName;

		this._dayNames = [];
		for (let i = 0; i < 7; i++) {
			weekday = i + this._getFirstDayOfWeek();
			if (weekday > 6) {
				weekday -= 7;
			}
			dayName = {
				id: `${this._id}-WH${i.toString()}`,
				name: aDayNamesWide[weekday],
				ultraShortName: aUltraShortNames[weekday],
				classes: "sapWCDayPickerDayName",
			};

			this._dayNames.push(dayName);
		}

		this._dayNames[0].classes += " sapWCDayPickerFirstWDay";
	}

	onclick(event) {
		const target = event.ui5target;
		const dayPressed = this._isDayPressed(target);

		if (dayPressed) {
			const targetDate = parseInt(target.getAttribute("data-sap-timestamp"));

			// findIndex, give it to item navigation
			for (let i = 0; i < this._weeks.length; i++) {
				for (let j = 0; j < this._weeks[i].length; j++) {
					if (parseInt(this._weeks[i][j].timestamp) === targetDate) {
						this._itemNav.current = parseInt(target.getAttribute("data-sap-index"));

						this._itemNav.update();
						break;
					}
				}
			}

			this._modifySelectionAndNotifySubscribers(targetDate, event.ctrlKey);
		}
	}

	onkeydown(event) {
		if (isEnter(event)) {
			return this._handleEnter(event);
		}

		if (isSpace(event)) {
			return this._handleSpace(event);
		}
	}

	_handleEnter(event) {
		event.preventDefault();
		if (event.ui5target.className.indexOf("sapWCDayPickerItem") > -1) {
			const targetDate = parseInt(event.ui5target.getAttribute("data-sap-timestamp"));
			this._modifySelectionAndNotifySubscribers(targetDate, event.ctrlKey);
		}
	}

	_handleSpace(event) {
		event.preventDefault();
		if (event.ui5target.className.indexOf("sapWCDayPickerItem") > -1) {
			const targetDate = parseInt(event.ui5target.getAttribute("data-sap-timestamp"));
			this._modifySelectionAndNotifySubscribers(targetDate, event.ctrlKey);
		}
	}

	get _timestamp() {
		return this.timestamp !== undefined ? this.timestamp : Math.floor(new Date().getTime() / 1000);
	}

	get _localDate() {
		return new Date(this._timestamp * 1000);
	}

	get _calendarDate() {
		return CalendarDate.fromTimestamp(this._localDate.getTime(), this._primaryCalendarType);
	}

	get _month() {
		return this._calendarDate.getMonth();
	}

	get _year() {
		return this._calendarDate.getYear();
	}

	get _currentCalendarDate() {
		return CalendarDate.fromTimestamp(new Date().getTime(), this._primaryCalendarType);
	}

	get _selectedDates() {
		return this.selectedDates || [];
	}

	get _primaryCalendarType() {
		return this.primaryCalendarType || getCalendarType() || LocaleData.getInstance(getLocale$1()).getPreferredCalendarType();
	}

	_modifySelectionAndNotifySubscribers(sNewDate, bAdd) {
		if (bAdd) {
			this.selectedDates = [...this._selectedDates, sNewDate];
		} else {
			this.selectedDates = [sNewDate];
		}

		this.fireEvent("selectionChange", { dates: [...this._selectedDates] });
	}

	_handleItemNavigationBorderReach(event) {
		const currentMonth = this._month,
			currentYear = this._year;
		let iNewMonth,
			iNewYear;

		if (event.end) {
			iNewMonth = currentMonth < 11 ? currentMonth + 1 : 0;
			iNewYear = currentMonth < 11 ? currentYear : currentYear + 1;
		} else if (event.start) {
			iNewMonth = currentMonth > 0 ? currentMonth - 1 : 11;
			iNewYear = currentMonth > 0 ? currentYear : currentYear - 1;
		}

		const oNewDate = this._calendarDate;
		oNewDate.setYear(iNewYear);
		oNewDate.setMonth(iNewMonth);

		if (oNewDate.getYear() < MIN_YEAR || oNewDate.getYear() > MAX_YEAR) {
			return;
		}

		this.fireEvent("navigate", { timestamp: (oNewDate.valueOf() / 1000) });
	}

	_isWeekend(oDate) {
		const iWeekDay = oDate.getDay(),
			iWeekendStart = this._oLocaleData.getWeekendStart(),
			iWeekendEnd = this._oLocaleData.getWeekendEnd();

		return (iWeekDay >= iWeekendStart && iWeekDay <= iWeekendEnd)
			|| (iWeekendEnd < iWeekendStart && (iWeekDay >= iWeekendStart || iWeekDay <= iWeekendEnd));
	}

	_isDayPressed(target) {
		const targetParent = target.parentNode;
		return (target.className.indexOf("sapWCDayPickerItem") > -1) || (targetParent && targetParent.className.indexOf("sapWCDayPickerItem") > -1);
	}

	_getVisibleDays(oStartDate, bIncludeBCDates) {
		let oCalDate,
			iDaysOldMonth,
			iYear;

		const _aVisibleDays = [];

		// If date passed generate days for new start date else return the current one
		if (!oStartDate) {
			return _aVisibleDays;
		}

		const iFirstDayOfWeek = this._getFirstDayOfWeek();

		// determine weekday of first day in month
		const oFirstDay = new CalendarDate(oStartDate, this._primaryCalendarType);
		oFirstDay.setDate(1);
		iDaysOldMonth = oFirstDay.getDay() - iFirstDayOfWeek;
		if (iDaysOldMonth < 0) {
			iDaysOldMonth = 7 + iDaysOldMonth;
		}

		if (iDaysOldMonth > 0) {
			// determine first day for display
			oFirstDay.setDate(1 - iDaysOldMonth);
		}

		const oDay = new CalendarDate(oFirstDay);
		for (let i = 0; i < 42; i++) {
			iYear = oDay.getYear();
			oCalDate = new CalendarDate(oDay, this._primaryCalendarType);
			if (bIncludeBCDates && iYear < MIN_YEAR) {
				// For dates before 0001-01-01 we should render only empty squares to keep
				// the month square matrix correct.
				oCalDate._bBeforeFirstYear = true;
				_aVisibleDays.push(oCalDate);
			} else if (iYear >= MIN_YEAR && iYear <= MAX_YEAR) {
				// Days before 0001-01-01 or after 9999-12-31 should not be rendered.
				_aVisibleDays.push(oCalDate);
			}
			oDay.setDate(oDay.getDate() + 1);
		}

		return _aVisibleDays;
	}

	_getFirstDayOfWeek() {
		return this._oLocaleData.getFirstDayOfWeek();
	}

	get classes() {
		return {
			wrapper: {
				"sapWCDayPicker": true,
				"sapUiSizeCompact": getCompactSize(),
			},
			weekNumberContainer: {
				"sapWCDayPickerWeekNumberContainer": true,
				"sapWCDayPickerHideWeekNumbers": this.primaryCalendarType === "Islamic",
			},
			weekDaysContainer: {
				"sapWCDayPickerDaysNamesContainer": true,
			},
			content: {
				"sapWCDayPickerContent": true,
			},
		};
	}

	get styles() {
		return {
			wrapper: {
				display: this._hidden ? "none" : "flex",
			},
			main: {
				width: "100%",
			},
		};
	}
}

Bootstrap.boot().then(_ => {
	DayPicker.define();
});

const block0$5 = (context) => { return html`<div	class="${ifDefined(classMap(context.classes.main))}"	role="grid"	aria-readonly="false"	aria-multiselectable="false"	style="${ifDefined(styleMap$1(context.styles.main))}">	${ repeat(context._quarters, undefined, (item, index) => block1$3(item, index, context)) }</div>`; };
const block1$3 = (item, index, context) => { return html`<div class="${ifDefined(classMap(context.classes.quarter))}">			${ repeat(item, undefined, (item, index) => block2$3(item, index, context)) }</div>	`; };
const block2$3 = (item, index, context) => { return html`<div					id="${ifDefined(item.id)}"					data-sap-timestamp=${ifDefined(item.timestamp)}					tabindex=${ifDefined(item._tabIndex)}					class="${ifDefined(item.classes)}"					role="gridcell"					aria-selected="false"				>					${ifDefined(item.name)}</div>			`; };

var styles$2 = ":host(ui5-month-picker){display:inline-block;width:100%;height:100%}ui5-month-picker{display:inline-block;width:100%;height:100%}.sapWCMonthPicker{padding:2rem 0 1rem 0;display:flex;flex-direction:column;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));font-size:var(--sapMFontMediumSize,.875rem);justify-content:center;align-items:center}.sapWCMonthPickerItem{display:flex;width:calc(33.333% - .125rem);height:3rem;color:var(--sapUiBaseText,var(--sapTextColor,var(--sapPrimary6,#32363a)));background-color:var(--_ui5_monthpicker_item_background_color,var(--sapUiListBackgroundDarken3,#f7f7f7));align-items:center;justify-content:center;margin:var(--_ui5_monthpicker_item_margin,1px);box-sizing:border-box;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:default;outline:none;position:relative;border:var(--_ui5_monthpicker_item_border,none);border-radius:var(--_ui5_monthpicker_item_border_radius,.25rem)}.sapWCMonthPickerItem:hover{background-color:var(--_ui5_monthpicker_item_hover_background_color,var(--sapUiListBackgroundDarken3,#f7f7f7))}.sapWCMonthPickerItem.sapWCMonthPickerItemSel{background-color:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHighlightColor,#0854a0)));color:var(--sapUiContentContrastTextColor,var(--sapContent_ContrastTextColor,#fff))}.sapWCMonthPickerItem.sapWCMonthPickerItemSel:focus{background-color:var(--_ui5_monthpicker_item_selected_focus,var(--sapUiSelectedDarken10,#063a6f))}.sapWCMonthPickerItem.sapWCMonthPickerItemSel:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapWCMonthPickerItem.sapWCMonthPickerItemSel:hover{background-color:var(--_ui5_monthpicker_item_selected_focus,var(--sapUiSelectedDarken10,#063a6f))}.sapWCMonthPickerItem:focus{background-color:var(--_ui5_monthpicker_item_focus_background_color,var(--sapUiListBackgroundDarken3,#f7f7f7))}.sapWCMonthPickerItem:focus:after{content:\"\";position:absolute;width:var(--_ui5_monthpicker_item_focus_after_width,calc(100% - .375rem));height:var(--_ui5_monthpicker_item_focus_after_height,calc(100% - .375rem));border:var(--_ui5_monthpicker_item_focus_after_border,1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)));top:var(--_ui5_monthpicker_item_focus_after_offset,2px);left:var(--_ui5_monthpicker_item_focus_after_offset,2px)}.sapWCMonthPickerQuarter{display:flex;justify-content:center;align-items:center;width:100%}.sapUiSizeCompact .sapWCMonthPickerItem{height:2rem}";

/**
 * @public
 */
const metadata$7 = {
	tag: "ui5-month-picker",
	properties: /** @lends  sap.ui.webcomponents.main.MonthPicker.prototype */ {
		/**
		 * A UNIX timestamp - seconds since 00:00:00 UTC on Jan 1, 1970.
		 * @type {Integer}
		 * @public
		 */
		timestamp: {
			type: Integer,
		},
		/**
		 * Sets a calendar type used for display.
		 * If not set, the calendar type of the global configuration is used.
		 * @type {string}
		 * @public
		 */
		primaryCalendarType: {
			type: CalendarType$1,
		},
		_quarters: {
			type: Object,
			multiple: true,
		},
		_hidden: {
			type: Boolean,
		},
	},
	events: /** @lends  sap.ui.webcomponents.main.MonthPicker.prototype */ {
		/**
		 * Fired when the user selects a new Date on the Web Component.
		 * @public
		 * @event
		 */
		selectedMonthChange: {},
	},
};

/**
 * Month picker component.
 *
 * @class
 *
 * Displays months which can be selected.
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.MonthPicker
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-month-picker
 * @public
 */
class MonthPicker extends UI5Element {
	static get metadata() {
		return metadata$7;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$5;
	}

	static get styles() {
		return styles$2;
	}

	constructor() {
		super();
		this._oLocale = getFormatLocale();
		this._oLocaleData = new LocaleData(this._oLocale);

		this._itemNav = new ItemNavigation(this, { rowSize: 3, cyclic: true });
		this._itemNav.getItemsCallback = function getItemsCallback() {
			return [].concat(...this._quarters);
		}.bind(this);
		this._itemNav.setItemsCallback = function setItemsCallback(items) {
			this._quarters = items;
		}.bind(this);

		this._delegates.push(this._itemNav);
	}

	onBeforeRendering() {
		const quarters = [];
		const oCalDate = CalendarDate.fromTimestamp(new Date().getTime(), this._primaryCalendarType);
		let timestamp;

		for (let i = 0; i < 12; i++) {
			oCalDate.setMonth(i);
			timestamp = oCalDate.valueOf() / 1000;

			const month = {
				timestamp: timestamp.toString(),
				id: `${this._state._id}-m${i}`,
				name: this._oLocaleData.getMonths("wide", this._primaryCalendarType)[i],
				classes: "sapWCMonthPickerItem",
			};

			if (this._month === i) {
				month.classes += " sapWCMonthPickerItemSel";
			}

			const quarterIndex = parseInt(i / 3);

			if (quarters[quarterIndex]) {
				quarters[quarterIndex].push(month);
			} else {
				quarters[quarterIndex] = [month];
			}
		}

		this._quarters = quarters;

		this._itemNav.init();
	}

	onAfterRendering() {
		this._itemNav.focusCurrent();
	}

	get _timestamp() {
		return this.timestamp !== undefined ? this.timestamp : Math.floor(new Date().getTime() / 1000);
	}

	get _localDate() {
		return new Date(this._timestamp * 1000);
	}

	get _calendarDate() {
		return CalendarDate.fromTimestamp(this._localDate.getTime(), this._primaryCalendarType);
	}

	get _month() {
		return this._calendarDate.getMonth();
	}

	get _primaryCalendarType() {
		return this.primaryCalendarType || getCalendarType() || LocaleData.getInstance(getLocale$1()).getPreferredCalendarType();
	}

	onclick(event) {
		if (event.ui5target.className.indexOf("sapWCMonthPickerItem") > -1) {
			const timestamp = this.getTimestampFromDOM(event.ui5target);
			this.timestamp = timestamp;
			this._itemNav.current = this._month;
			this.fireEvent("selectedMonthChange", { timestamp });
		}
	}

	onkeydown(event) {
		if (isSpace(event) || isEnter(event)) {
			this._activateMonth(event);
		}
	}

	_activateMonth(event) {
		event.preventDefault();
		if (event.ui5target.className.indexOf("sapWCMonthPickerItem") > -1) {
			const timestamp = this.getTimestampFromDOM(event.ui5target);
			this.timestamp = timestamp;
			this.fireEvent("selectedMonthChange", { timestamp });
		}
	}

	getTimestampFromDOM(domNode) {
		const oMonthDomRef = domNode.getAttribute("data-sap-timestamp");
		return parseInt(oMonthDomRef);
	}

	get classes() {
		return {
			main: {
				"sapWCMonthPicker": true,
				"sapUiSizeCompact": getCompactSize(),
			},
			quarter: {
				"sapWCMonthPickerQuarter": true,
			},
		};
	}

	get styles() {
		return {
			main: {
				display: this._hidden ? "none" : "",
			},
		};
	}
}

Bootstrap.boot().then(_ => {
	MonthPicker.define();
});

const block0$6 = (context) => { return html`<div	class="${ifDefined(classMap(context.classes.main))}"	role="grid"	aria-readonly="false"	aria-multiselectable="false"	style="${ifDefined(styleMap$1(context.styles.main))}">	${ repeat(context._yearIntervals, undefined, (item, index) => block1$4(item, index, context)) }</div>`; };
const block1$4 = (item, index, context) => { return html`<div class="${ifDefined(classMap(context.classes.yearInterval))}">			${ repeat(item, undefined, (item, index) => block2$4(item, index, context)) }</div>	`; };
const block2$4 = (item, index, context) => { return html`<div id="${ifDefined(item.id)}"					tabindex="${ifDefined(item._tabIndex)}"					data-sap-timestamp="${ifDefined(item.timestamp)}"					class="${ifDefined(item.classes)}"					role="gridcell"					aria-selected="false">						${ifDefined(item.year)}</div>			`; };

var styles$3 = ":host(ui5-yearpicker){display:inline-block;width:100%;height:100%}ui5-yearpicker{display:inline-block;width:100%;height:100%}.sapWCYearPicker{padding:2rem 0 1rem 0;display:flex;flex-direction:column;font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));font-size:var(--sapMFontMediumSize,.875rem);justify-content:center;align-items:center}.sapWCYearPickerIntervalContainer{display:flex;justify-content:center;align-items:center;width:100%}.sapWCYearPickerItem{display:flex;margin:var(--_ui5_yearpicker_item_margin,1px);width:calc(25% - .125rem);height:3rem;color:var(--sapUiBaseText,var(--sapTextColor,var(--sapPrimary6,#32363a)));background-color:var(--_ui5_yearpicker_item_background_color,var(--sapUiListBackgroundDarken3,#f7f7f7));align-items:center;justify-content:center;box-sizing:border-box;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:default;outline:none;position:relative;border:var(--_ui5_yearpicker_item_border,none);border-radius:var(--_ui5_yearpicker_item_border_radius,.25rem)}.sapWCYearPickerItem:hover{background-color:var(--_ui5_yearpicker_item_hover_background_color,var(--sapUiListBackgroundDarken3,#f7f7f7))}.sapWCYearPickerItem:focus{background-color:var(--_ui5_yearpicker_item_focus_background_color,var(--sapUiListBackgroundDarken3,#f7f7f7))}.sapWCYearPickerItem.sapWCYearPickerItemSel{background-color:var(--sapUiSelected,var(--sapSelectedColor,var(--sapHighlightColor,#0854a0)));color:var(--sapUiContentContrastTextColor,var(--sapContent_ContrastTextColor,#fff))}.sapWCYearPickerItem.sapWCYearPickerItemSel:focus{background-color:var(--_ui5_yearpicker_item_selected_focus,var(--sapUiSelectedDarken10,#063a6f))}.sapWCYearPickerItem.sapWCYearPickerItemSel:focus:after{border-color:var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}.sapWCYearPickerItem.sapWCYearPickerItemSel:hover{background-color:var(--_ui5_yearpicker_item_selected_focus,var(--sapUiSelectedDarken10,#063a6f))}.sapWCYearPickerItem:focus:after{content:\"\";position:absolute;width:var(--_ui5_yearpicker_item_focus_after_width,calc(100% - .375rem));height:var(--_ui5_yearpicker_item_focus_after_height,calc(100% - .375rem));border:var(--_ui5_yearpicker_item_focus_after_border,1px dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000)));top:var(--_ui5_yearpicker_item_focus_after_offset,2px);left:var(--_ui5_yearpicker_item_focus_after_offset,2px)}.sapUiSizeCompact .sapWCYearPickerItem{height:2rem}";

/**
 * @public
 */
const metadata$8 = {
	tag: "ui5-yearpicker",
	properties: /** @lends  sap.ui.webcomponents.main.YearPicker.prototype */ {
		/**
		 * A UNIX timestamp - seconds since 00:00:00 UTC on Jan 1, 1970.
		 * @type {Integer}
		 * @public
		 */
		timestamp: {
			type: Integer,
		},
		/**
		 * Sets a calendar type used for display.
		 * If not set, the calendar type of the global configuration is used.
		 * @type {string}
		 * @public
		 */
		primaryCalendarType: {
			type: CalendarType$1,
		},
		_selectedYear: {
			type: Integer,
		},
		_yearIntervals: {
			type: Object,
			multiple: true,
		},
		_hidden: {
			type: Boolean,
		},
	},
	events: /** @lends  sap.ui.webcomponents.main.YearPicker.prototype */ {
		/**
		 * Fired when the user selects a new Date on the Web Component.
		 * @public
		 * @event
		 */
		selectedYearChange: {},
	},
};

/**
 * @class
 *
 * Displays years which can be selected.
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.YearPicker
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-yearpicker
 * @public
 */
class YearPicker extends UI5Element {
	static get metadata() {
		return metadata$8;
	}

	static get styles() {
		return styles$3;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$6;
	}

	constructor() {
		super();

		this._oLocale = getFormatLocale();

		this._itemNav = new ItemNavigation(this, { rowSize: 4 });
		this._itemNav.getItemsCallback = function getItemsCallback() {
			return [].concat(...this._yearIntervals);
		}.bind(this);
		this._itemNav.setItemsCallback = function setItemsCallback(items) {
			this._yearIntervals = items;
		}.bind(this);

		this._itemNav.attachEvent(
			ItemNavigation.BORDER_REACH,
			this._handleItemNavigationBorderReach.bind(this)
		);

		this._yearIntervals = [];

		this._delegates.push(this._itemNav);
	}

	onBeforeRendering() {
		const oYearFormat = DateFormat.getDateInstance({ format: "y", calendarType: this._primaryCalendarType }, this._oLocale);
		const oCalDate = this._calendarDate;
		oCalDate.setMonth(0);
		oCalDate.setDate(1);
		if (oCalDate.getYear() - YearPicker._MIDDLE_ITEM_INDEX - 1 > YearPicker._MAX_YEAR - YearPicker._ITEMS_COUNT) {
			oCalDate.setYear(YearPicker._MAX_YEAR - YearPicker._ITEMS_COUNT);
		} else if (oCalDate.getYear() - YearPicker._MIDDLE_ITEM_INDEX - 1 < YearPicker._MIN_YEAR) {
			oCalDate.setYear(YearPicker._MIN_YEAR - 1);
		} else {
			oCalDate.setYear(oCalDate.getYear() - YearPicker._MIDDLE_ITEM_INDEX - 1);
		}

		const intervals = [];
		let timestamp;

		if (this._selectedYear === undefined) {
			this._selectedYear = this._year;
		}

		for (let i = 0; i < YearPicker._ITEMS_COUNT; i++) {
			const intervalIndex = parseInt(i / 4);
			if (!intervals[intervalIndex]) {
				intervals[intervalIndex] = [];
			}

			oCalDate.setYear(oCalDate.getYear() + 1);

			timestamp = oCalDate.valueOf() / 1000;

			const year = {
				timestamp: timestamp.toString(),
				id: `${this._state._id}-y${timestamp}`,
				year: oYearFormat.format(oCalDate.toLocalJSDate()),
				classes: "sapWCYearPickerItem",
			};

			if (oCalDate.getYear() === this._selectedYear) {
				year.classes += " sapWCYearPickerItemSel";
			}

			if (intervals[intervalIndex]) {
				intervals[intervalIndex].push(year);
			}
		}

		this._yearIntervals = intervals;

		this._itemNav.init();
	}

	onAfterRendering() {
		this._itemNav.focusCurrent();
	}

	get _timestamp() {
		return this.timestamp !== undefined ? this.timestamp : Math.floor(new Date().getTime() / 1000);
	}

	get _localDate() {
		return new Date(this._timestamp * 1000);
	}

	get _calendarDate() {
		return CalendarDate.fromTimestamp(this._localDate.getTime(), this._primaryCalendarType);
	}

	get _year() {
		return this._calendarDate.getYear();
	}

	get _primaryCalendarType() {
		return this.primaryCalendarType || getCalendarType() || LocaleData.getInstance(getLocale$1()).getPreferredCalendarType();
	}

	onclick(event) {
		if (event.ui5target.className.indexOf("sapWCYearPickerItem") > -1) {
			const timestamp = this.getTimestampFromDom(event.ui5target);
			this.timestamp = timestamp;
			this._selectedYear = this._year;
			this._itemNav.current = YearPicker._MIDDLE_ITEM_INDEX;
			this.fireEvent("selectedYearChange", { timestamp });
		}
	}

	getTimestampFromDom(domNode) {
		const sTimestamp = domNode.getAttribute("data-sap-timestamp");
		return parseInt(sTimestamp);
	}

	onkeydown(event) {
		if (isEnter(event)) {
			return this._handleEnter(event);
		}

		if (isSpace(event)) {
			return this._handleSpace(event);
		}
	}

	_handleEnter(event) {
		event.preventDefault();
		if (event.ui5target.className.indexOf("sapWCYearPickerItem") > -1) {
			const timestamp = this.getTimestampFromDom(event.ui5target);

			this.timestamp = timestamp;
			this._selectedYear = this._year;
			this._itemNav.current = YearPicker._MIDDLE_ITEM_INDEX;
			this.fireEvent("selectedYearChange", { timestamp });
		}
	}

	_handleSpace(event) {
		event.preventDefault();
		if (event.ui5target.className.indexOf("sapWCYearPickerItem") > -1) {
			const timestamp = this.getTimestampFromDom(event.ui5target);

			this._selectedYear = CalendarDate.fromTimestamp(
				timestamp * 1000,
				this._primaryCalendarType
			).getYear();
		}
	}

	_handleItemNavigationBorderReach(event) {
		const oCalDate = this._calendarDate;
		oCalDate.setMonth(0);
		oCalDate.setDate(1);

		if (event.end) {
			oCalDate.setYear(oCalDate.getYear() + YearPicker._ITEMS_COUNT);
		} else if (event.start) {
			if (oCalDate.getYear() - YearPicker._MIDDLE_ITEM_INDEX < YearPicker._MIN_YEAR) {
				return;
			}
			oCalDate.setYear(oCalDate.getYear() - YearPicker._ITEMS_COUNT);
		}

		if (oCalDate.getYear() - YearPicker._MIDDLE_ITEM_INDEX > YearPicker._MAX_YEAR) {
			return;
		}

		this.timestamp = oCalDate.valueOf() / 1000;
	}

	get classes() {
		return {
			main: {
				sapWCYearPicker: true,
				sapUiSizeCompact: getCompactSize(),
			},
			yearInterval: {
				sapWCYearPickerIntervalContainer: true,
			},
		};
	}

	get styles() {
		return {
			main: {
				display: this._hidden ? "none" : "",
			},
		};
	}
}

YearPicker._ITEMS_COUNT = 20;
YearPicker._MIDDLE_ITEM_INDEX = 7;
YearPicker._MAX_YEAR = 9999;
YearPicker._MIN_YEAR = 1;

Bootstrap.boot().then(_ => {
	YearPicker.define();
});

const block0$7 = (context) => { return html`<div class="${ifDefined(classMap(context.classes.main))}" style="${ifDefined(styleMap$1(context.styles.main))}"><ui5-calendar-header		id="${ifDefined(context._id)}-head"		month-text="${ifDefined(context._header.monthText)}"		year-text="${ifDefined(context._header.yearText)}"		.primaryCalendarType="${ifDefined(context._oMonth.primaryCalendarType)}"		@ui5-pressPrevious="${ifDefined(context._header.onPressPrevious)}"		@ui5-pressNext="${ifDefined(context._header.onPressNext)}"		@ui5-btn1Press="${ifDefined(context._header.onBtn1Press)}"		@ui5-btn2Press="${ifDefined(context._header.onBtn2Press)}"	></ui5-calendar-header><div id="${ifDefined(context._id)}-content" class="sapUiCalContent"><ui5-daypicker			id="${ifDefined(context._id)}-daypicker"			class="${ifDefined(classMap(context.classes.dayPicker))}"			format-pattern="${ifDefined(context._oMonth.formatPattern)}"			.selectedDates="${ifDefined(context._oMonth.selectedDates)}"			._hidden="${ifDefined(context._oMonth._hidden)}"			.primaryCalendarType="${ifDefined(context._oMonth.primaryCalendarType)}"			timestamp="${ifDefined(context._oMonth.timestamp)}"			@ui5-selectionChange="${ifDefined(context._oMonth.onSelectedDatesChange)}"			@ui5-navigate="${ifDefined(context._oMonth.onNavigate)}"		></ui5-daypicker><ui5-month-picker			id="${ifDefined(context._id)}-MP"			class="${ifDefined(classMap(context.classes.monthPicker))}"			._hidden="${ifDefined(context._monthPicker._hidden)}"			.primaryCalendarType="${ifDefined(context._oMonth.primaryCalendarType)}"			timestamp="${ifDefined(context._monthPicker.timestamp)}"			@ui5-selectedMonthChange="${ifDefined(context._monthPicker.onSelectedMonthChange)}"		></ui5-month-picker><ui5-yearpicker				id="${ifDefined(context._id)}-YP"				class="${ifDefined(classMap(context.classes.yearPicker))}"				._hidden="${ifDefined(context._yearPicker._hidden)}"				.primaryCalendarType="${ifDefined(context._oMonth.primaryCalendarType)}"				timestamp="${ifDefined(context._yearPicker.timestamp)}"				._selectedYear="${ifDefined(context._yearPicker._selectedYear)}"				@ui5-selectedYearChange="${ifDefined(context._yearPicker.onSelectedYearChange)}"		></ui5-yearpicker></div></div>`; };

var Gregorian = UniversalDate.extend('sap.ui.core.date.Gregorian', {
    constructor: function () {
        this.oDate = this.createDate(Date, arguments);
        this.sCalendarType = CalendarType.Gregorian;
    }
});
Gregorian.UTC = function () {
    return Date.UTC.apply(Date, arguments);
};
Gregorian.now = function () {
    return Date.now();
};
CalendarClassRegistry.setCalendarClass(CalendarType.Gregorian, Gregorian);

var calendarCSS = "ui5-calendar{display:inline-block}:host(ui5-calendar){display:inline-block}.sapWCDayPickerHidden,.sapWCMonthPickerHidden,.sapWCYearPickerHidden{display:none}.sapUiCal{background:var(--sapUiListBackground,var(--sapList_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))))}.sapUiCal ui5-daypicker,.sapUiCal ui5-month-picker,.sapUiCal ui5-yearpicker{vertical-align:top}";

/**
 * @public
 */
const metadata$9 = {
	tag: "ui5-calendar",
	properties: /** @lends  sap.ui.webcomponents.main.Calendar.prototype */ {
		/**
		 * It's a UNIX timestamp - seconds since 00:00:00 UTC on Jan 1, 1970.
		 * @type {Integer}
		 * @public
		*/
		timestamp: {
			type: Integer,
		},

		/**
		 * Sets a calendar type used for display.
		 * If not set, the calendar type of the global configuration is used.
		 * Available options are: "Gregorian", "Islamic", "Japanese", "Buddhist" and "Persian".
		 * @type {string}
		 * @public
		 */
		primaryCalendarType: {
			type: CalendarType$1,
		},

		/**
		 * Sets the selected dates as UTC timestamps.
		 * @type {Array}
		 * @public
		 */
		selectedDates: {
			type: Integer,
			multiple: true,
			deepEqual: true,
		},

		_header: {
			type: Object,
		},
		_oMonth: {
			type: Object,
		},
		_monthPicker: {
			type: Object,
		},
		_yearPicker: {
			type: Object,
		},

		_calendarWidth: {
			type: String,
		},

		_calendarHeight: {
			type: String,
		},
		formatPattern: {
			type: String,
		},
	},
	events: /** @lends  sap.ui.webcomponents.main.Calendar.prototype */ {
		/**
		 * Fired when the selected dates changed.
		 * @event
		 * @param {Array} dates The selected dates' timestamps
		 * @public
		 */
		selectedDatesChange: { type: Array },
	},
};

/**
 * @class
 *
 * It can be used for a date picker.
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Calendar
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-calendar
 * @public
 */
class Calendar extends UI5Element {
	static get metadata() {
		return metadata$9;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$7;
	}

	static get styles() {
		return calendarCSS;
	}

	constructor() {
		super();
		this._oLocale = getFormatLocale();
		this._oLocaleData = new LocaleData(this._oLocale);
		this._header = {};
		this._header.onPressPrevious = this._handlePrevious.bind(this);
		this._header.onPressNext = this._handleNext.bind(this);
		this._header.onBtn1Press = this._handleMonthButtonPress.bind(this);
		this._header.onBtn2Press = this._handleYearButtonPress.bind(this);

		this._oMonth = {};
		this._oMonth.onSelectedDatesChange = this._handleSelectedDatesChange.bind(this);
		this._oMonth.onNavigate = this._handleMonthNavigate.bind(this);

		this._monthPicker = {};
		this._monthPicker._hidden = true;
		this._monthPicker.onSelectedMonthChange = this._handleSelectedMonthChange.bind(this);

		this._yearPicker = {};
		this._yearPicker._hidden = true;
		this._yearPicker.onSelectedYearChange = this._handleSelectedYearChange.bind(this);

		this._isShiftingYears = false;
	}

	onBeforeRendering() {
		const oYearFormat = DateFormat.getDateInstance({ format: "y", calendarType: this._primaryCalendarType });

		this._oMonth.formatPattern = this._formatPattern;
		this._oMonth.timestamp = this._timestamp;
		this._oMonth.selectedDates = [...this._selectedDates];
		this._oMonth.primaryCalendarType = this._primaryCalendarType;

		this._header.monthText = this._oLocaleData.getMonths("wide", this._primaryCalendarType)[this._month];
		this._header.yearText = oYearFormat.format(this._localDate);

		// month picker
		this._monthPicker.primaryCalendarType = this._primaryCalendarType;
		this._monthPicker.timestamp = this._timestamp;

		this._yearPicker.primaryCalendarType = this._primaryCalendarType;

		if (!this._isShiftingYears) {
			// year picker
			this._yearPicker.timestamp = this._timestamp;
		}

		this._isShiftingYears = false;
	}

	get _timestamp() {
		return this.timestamp !== undefined ? this.timestamp : Math.floor(new Date().getTime() / 1000);
	}

	get _localDate() {
		return new Date(this._timestamp * 1000);
	}

	get _calendarDate() {
		return CalendarDate.fromTimestamp(this._localDate.getTime(), this._primaryCalendarType);
	}

	get _month() {
		return this._calendarDate.getMonth();
	}

	get _primaryCalendarType() {
		return this.primaryCalendarType || getCalendarType() || LocaleData.getInstance(getLocale$1()).getPreferredCalendarType();
	}

	get _formatPattern() {
		return this.formatPattern || "medium"; // get from config
	}

	get _isPattern() {
		return this._formatPattern !== "medium" && this._formatPattern !== "short" && this._formatPattern !== "long";
	}

	get _selectedDates() {
		return this.selectedDates || [];
	}

	_handleSelectedDatesChange(event) {
		this.selectedDates = [...event.detail.dates];

		this.fireEvent("selectedDatesChange", { dates: event.detail.dates });
	}

	_handleMonthNavigate(event) {
		this.timestamp = event.detail.timestamp;
	}

	_handleSelectedMonthChange(event) {
		const oNewDate = this._calendarDate;
		const newMonthIndex = CalendarDate.fromTimestamp(
			event.detail.timestamp * 1000,
			this._primaryCalendarType
		).getMonth();

		oNewDate.setMonth(newMonthIndex);
		this.timestamp = oNewDate.valueOf() / 1000;

		this._hideMonthPicker();

		this._focusFirstDayOfMonth(oNewDate);
	}

	_focusFirstDayOfMonth(targetDate) {
		let fistDayOfMonthIndex = -1;

		// focus first day of the month
		const dayPicker = this.shadowRoot.querySelector("ui5-daypicker");

		dayPicker._getVisibleDays(targetDate).forEach((date, index) => {
			if (date.getDate() === 1 && (fistDayOfMonthIndex === -1)) {
				fistDayOfMonthIndex = index;
			}
		});

		const firstDay = dayPicker.shadowRoot.querySelector(".sapWCDayPickerItemsContainer").children[0].children[fistDayOfMonthIndex];

		dayPicker._itemNav.current = fistDayOfMonthIndex;

		setTimeout(() => {
			if (firstDay) {
				firstDay.focus();
			}
		}, 100);
	}

	_handleSelectedYearChange(event) {
		const oOldMonth = this._calendarDate.getMonth();
		const oOldDay = this._calendarDate.getDate();
		const oNewDate = CalendarDate.fromTimestamp(
			event.detail.timestamp * 1000,
			this._primaryCalendarType
		);
		oNewDate.setMonth(oOldMonth);
		oNewDate.setDate(oOldDay);

		this.timestamp = oNewDate.valueOf() / 1000;

		this._hideYearPicker();

		this._focusFirstDayOfMonth(oNewDate);
	}

	_handleMonthButtonPress() {
		this._hideYearPicker();

		this[`_${this._monthPicker._hidden ? "show" : "hide"}MonthPicker`]();
	}

	_handleYearButtonPress() {
		this._hideMonthPicker();

		this[`_${this._yearPicker._hidden ? "show" : "hide"}YearPicker`]();
	}

	_handlePrevious() {
		if (this._monthPicker._hidden && this._yearPicker._hidden) {
			this._showPrevMonth();
		} else if (this._monthPicker._hidden && !this._yearPicker._hidden) {
			this._showPrevPageYears();
		} else if (!this._monthPicker._hidden && this._yearPicker._hidden) {
			this._showPrevYear();
		}
	}

	_handleNext() {
		if (this._monthPicker._hidden && this._yearPicker._hidden) {
			this._showNextMonth();
		} else if (this._monthPicker._hidden && !this._yearPicker._hidden) {
			this._showNextPageYears();
		} else if (!this._monthPicker._hidden && this._yearPicker._hidden) {
			this._showNextYear();
		}
	}

	_showNextMonth() {
		const nextMonth = this._calendarDate;
		nextMonth.setDate(1);
		nextMonth.setMonth(nextMonth.getMonth() + 1);

		if (nextMonth.getYear() > YearPicker._MAX_YEAR) {
			return;
		}

		this._focusFirstDayOfMonth(nextMonth);
		this.timestamp = nextMonth.valueOf() / 1000;
	}

	_showPrevMonth() {
		let iNewMonth = this._month - 1,
			iNewYear = this._calendarDate.getYear();

		// focus first day of the month
		const dayPicker = this.shadowRoot.querySelector("ui5-daypicker");
		const currentMonthDate = dayPicker._calendarDate.setMonth(dayPicker._calendarDate.getMonth());
		const lastMonthDate = dayPicker._calendarDate.setMonth(dayPicker._calendarDate.getMonth() - 1);

		// set the date to last day of last month
		currentMonthDate.setDate(-1);

		// find the index of the last day
		let lastDayOfMonthIndex = -1;

		dayPicker._getVisibleDays(lastMonthDate).forEach((date, index) => {
			const isSameDate = currentMonthDate.getDate() === date.getDate();
			const isSameMonth = currentMonthDate.getMonth() === date.getMonth();

			if (isSameDate && isSameMonth) {
				lastDayOfMonthIndex = (index + 1);
			}
		});

		const weekDaysCount = 7;

		if (lastDayOfMonthIndex !== -1) {
			// find the DOM for the last day index
			const lastDay = dayPicker.shadowRoot.querySelector(".sapWCDayPickerItemsContainer").children[parseInt(lastDayOfMonthIndex / weekDaysCount)].children[(lastDayOfMonthIndex % weekDaysCount)];

			// update current item in ItemNavigation
			dayPicker._itemNav.current = lastDayOfMonthIndex;

			// focus the item
			lastDay.focus();
		}

		if (iNewMonth > 11) {
			iNewMonth = 0;
			iNewYear = this._calendarDate.getYear() + 1;
		}

		if (iNewMonth < 0) {
			iNewMonth = 11;
			iNewYear = this._calendarDate.getYear() - 1;
		}

		const oNewDate = this._calendarDate;
		oNewDate.setYear(iNewYear);
		oNewDate.setMonth(iNewMonth);


		if (oNewDate.getYear() < YearPicker._MIN_YEAR) {
			return;
		}
		this.timestamp = oNewDate.valueOf() / 1000;
	}

	_showNextYear() {
		if (this._calendarDate.getYear() === YearPicker._MAX_YEAR) {
			return;
		}

		const oNewDate = this._calendarDate;
		oNewDate.setYear(this._calendarDate.getYear() + 1);

		this.timestamp = oNewDate.valueOf() / 1000;
	}

	_showPrevYear() {
		if (this._calendarDate.getYear() === YearPicker._MIN_YEAR) {
			return;
		}

		const oNewDate = this._calendarDate;
		oNewDate.setYear(this._calendarDate.getYear() - 1);

		this.timestamp = oNewDate.valueOf() / 1000;
	}

	_showNextPageYears() {
		if (!this._isYearInRange(this._yearPicker.timestamp,
			YearPicker._ITEMS_COUNT - YearPicker._MIDDLE_ITEM_INDEX,
			YearPicker._MIN_YEAR,
			YearPicker._MAX_YEAR)) {
			return;
		}

		this._yearPicker = Object.assign({}, this._yearPicker, {
			timestamp: this._yearPicker.timestamp + (31536000 * YearPicker._ITEMS_COUNT),
		});

		this._isShiftingYears = true;
	}

	_showPrevPageYears() {
		if (!this._isYearInRange(this._yearPicker.timestamp,
			-YearPicker._MIDDLE_ITEM_INDEX - 1,
			YearPicker._MIN_YEAR,
			YearPicker._MAX_YEAR)) {
			return;
		}

		this._yearPicker = Object.assign({}, this._yearPicker, {
			timestamp: this._yearPicker.timestamp - (31536000 * YearPicker._ITEMS_COUNT),
		});

		this._isShiftingYears = true;
	}

	_showMonthPicker() {
		this._monthPicker = Object.assign({}, this._monthPicker);
		this._oMonth = Object.assign({}, this._oMonth);

		this._monthPicker.timestamp = this._timestamp;
		this._monthPicker._hidden = false;
		this._oMonth._hidden = true;

		const calendarRect = this.shadowRoot.querySelector(".sapUiCal").getBoundingClientRect();

		this._calendarWidth = calendarRect.width.toString();
		this._calendarHeight = calendarRect.height.toString();
	}

	_showYearPicker() {
		this._yearPicker = Object.assign({}, this._yearPicker);
		this._oMonth = Object.assign({}, this._oMonth);

		this._yearPicker.timestamp = this._timestamp;
		this._yearPicker._selectedYear = this._calendarDate.getYear();
		this._yearPicker._hidden = false;
		this._oMonth._hidden = true;

		const calendarRect = this.shadowRoot.querySelector(".sapUiCal").getBoundingClientRect();

		this._calendarWidth = calendarRect.width.toString();
		this._calendarHeight = calendarRect.height.toString();
	}

	_hideMonthPicker() {
		this._monthPicker = Object.assign({}, this._monthPicker);
		this._oMonth = Object.assign({}, this._oMonth);

		this._monthPicker._hidden = true;
		this._oMonth._hidden = false;
	}

	_hideYearPicker() {
		this._yearPicker = Object.assign({}, this._yearPicker);
		this._oMonth = Object.assign({}, this._oMonth);

		this._yearPicker._hidden = true;
		this._oMonth._hidden = false;
	}

	_isYearInRange(timestamp, yearsoffset, min, max) {
		if (timestamp) {
			const oCalDate = CalendarDate.fromTimestamp(timestamp * 1000, this._primaryCalendarType);
			oCalDate.setMonth(0);
			oCalDate.setDate(1);
			oCalDate.setYear(oCalDate.getYear() + yearsoffset);
			return oCalDate.getYear() >= min && oCalDate.getYear() <= max;
		}
	}

	get classes() {
		return {
			main: {
				sapUiCal: true,
				sapUiCalIslamic: this.primaryCalendarType === CalendarType$1.Islamic,
			},
			dayPicker: {
				"sapWCDayPickerHidden": !this._yearPicker._hidden || !this._monthPicker._hidden,
			},
			yearPicker: {
				"sapWCYearPickerHidden": this._yearPicker._hidden,
			},
			monthPicker: {
				"sapWCMonthPickerHidden": this._monthPicker._hidden,
			},
		};
	}

	get styles() {
		return {
			main: {
				"height": `${this._calendarHeight ? `${this._calendarHeight}px` : "auto"}`,
				"width": `${this._calendarWidth ? `${this._calendarWidth}px` : "auto"}`,
			},
		};
	}

	static async define(...params) {
		await Promise.all([
			fetchCldrData(getLocale$1().getLanguage(), getLocale$1().getRegion(), getLocale$1().getScript()),
			CalendarHeader.define(),
			DayPicker.define(),
			MonthPicker.define(),
			YearPicker.define(),
		]);

		super.define(...params);
	}
}
Bootstrap.boot().then(_ => {
	Calendar.define();
});

const Device = {};
const BROWSER = {
  "INTERNET_EXPLORER": "ie",
  "EDGE": "ed",
  "FIREFOX": "ff",
  "CHROME": "cr",
  "SAFARI": "sf",
  "ANDROID": "an"
};
const _calcBrowser = () => {
  const sUserAgent = navigator.userAgent.toLowerCase();
  const rwebkit = /(webkit)[ \/]([\w.]+)/;
  const rmsie = /(msie) ([\w.]+)/;
  const rmsie11 = /(trident)\/[\w.]+;.*rv:([\w.]+)/;
  const redge = /(edge)[ \/]([\w.]+)/;
  const rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/;
  const browserMatch = redge.exec(sUserAgent) || rmsie11.exec(sUserAgent) || rwebkit.exec(sUserAgent) || rmsie.exec(sUserAgent) || sUserAgent.indexOf("compatible") < 0 && rmozilla.exec(sUserAgent) || [];
  const oRes = {
    browser: browserMatch[1] || "",
    version: browserMatch[2] || "0"
  };
  oRes[oRes.browser] = true;
  return oRes;
};
const _getBrowser = () => {
  const oBrowser = _calcBrowser();
  const sUserAgent = navigator.userAgent;
  const oNavigator = window.navigator;
  let oExpMobile;
  let oResult;
  if (oBrowser.mozilla) {
    oExpMobile = /Mobile/;
    if (sUserAgent.match(/Firefox\/(\d+\.\d+)/)) {
      var fVersion = parseFloat(RegExp.$1);
      oResult = {
        name: BROWSER.FIREFOX,
        versionStr: "" + fVersion,
        version: fVersion,
        mozilla: true,
        mobile: oExpMobile.test(sUserAgent)
      };
    } else {
      oResult = {
        mobile: oExpMobile.test(sUserAgent),
        mozilla: true,
        version: -1
      };
    }
  } else if (oBrowser.webkit) {
    var regExpWebkitVersion = sUserAgent.toLowerCase().match(/webkit[\/]([\d.]+)/);
    var webkitVersion;
    if (regExpWebkitVersion) {
      webkitVersion = regExpWebkitVersion[1];
    }
    oExpMobile = /Mobile/;
    var aChromeMatch = sUserAgent.match(/(Chrome|CriOS)\/(\d+\.\d+).\d+/);
    var aFirefoxMatch = sUserAgent.match(/FxiOS\/(\d+\.\d+)/);
    var aAndroidMatch = sUserAgent.match(/Android .+ Version\/(\d+\.\d+)/);
    if (aChromeMatch || aFirefoxMatch || aAndroidMatch) {
      var sName, sVersion, bMobile;
      if (aChromeMatch) {
        sName = BROWSER.CHROME;
        bMobile = oExpMobile.test(sUserAgent);
        sVersion = parseFloat(aChromeMatch[2]);
      } else if (aFirefoxMatch) {
        sName = BROWSER.FIREFOX;
        bMobile = true;
        sVersion = parseFloat(aFirefoxMatch[1]);
      } else if (aAndroidMatch) {
        sName = BROWSER.ANDROID;
        bMobile = oExpMobile.test(sUserAgent);
        sVersion = parseFloat(aAndroidMatch[1]);
      }
      oResult = {
        name: sName,
        mobile: bMobile,
        versionStr: "" + sVersion,
        version: sVersion,
        webkit: true,
        webkitVersion: webkitVersion
      };
    } else {
      var oExp = /(Version|PhantomJS)\/(\d+\.\d+).*Safari/;
      var bStandalone = oNavigator.standalone;
      if (oExp.test(sUserAgent)) {
        var aParts = oExp.exec(sUserAgent);
        var fVersion = parseFloat(aParts[2]);
        oResult = {
          name: BROWSER.SAFARI,
          versionStr: "" + fVersion,
          fullscreen: false,
          webview: false,
          version: fVersion,
          mobile: oExpMobile.test(sUserAgent),
          webkit: true,
          webkitVersion: webkitVersion,
          phantomJS: aParts[1] === "PhantomJS"
        };
      } else if ((/iPhone|iPad|iPod/).test(sUserAgent) && !(/CriOS/).test(sUserAgent) && !(/FxiOS/).test(sUserAgent) && (bStandalone === true || bStandalone === false)) {
        oResult = {
          name: BROWSER.SAFARI,
          version: -1,
          fullscreen: bStandalone,
          webview: !bStandalone,
          mobile: oExpMobile.test(sUserAgent),
          webkit: true,
          webkitVersion: webkitVersion
        };
      } else {
        oResult = {
          mobile: oExpMobile.test(sUserAgent),
          webkit: true,
          webkitVersion: webkitVersion,
          version: -1
        };
      }
    }
  } else if (oBrowser.msie || oBrowser.trident) {
    var fVersion = parseFloat(oBrowser.version);
    oResult = {
      name: BROWSER.INTERNET_EXPLORER,
      versionStr: "" + fVersion,
      version: fVersion,
      msie: true,
      mobile: false
    };
  } else if (oBrowser.edge) {
    var fVersion = fVersion = parseFloat(oBrowser.version);
    oResult = {
      name: BROWSER.EDGE,
      versionStr: "" + fVersion,
      version: fVersion,
      edge: true
    };
  } else {
    oResult = {
      name: "",
      versionStr: "",
      version: -1,
      mobile: false
    };
  }
  return oResult;
};
const _setBrowser = () => {
  Device.browser = _getBrowser();
  Device.browser.BROWSER = BROWSER;
  if (Device.browser.name) {
    for (var b in BROWSER) {
      if (BROWSER[b] === Device.browser.name) {
        Device.browser[b.toLowerCase()] = true;
      }
    }
  }
};
const isIE = () => {
  if (!Device.browser) {
    _setBrowser();
  }
  return !!Device.browser.msie;
};

const InputTypes = {
	Text: "Text",
	Email: "Email",
	Number: "Number",
	Password: "Password",
	Tel: "Tel",
	URL: "URL",
};

class InputType extends DataType {
	static isValid(value) {
		return !!InputTypes[value];
	}
}

InputType.generataTypeAcessors(InputTypes);

const block0$8 = (context) => { return html`<div	class="${ifDefined(classMap(context.classes.main))}"	style="width: 100%;"	?aria-invalid="${ifDefined(context.ariaInvalid)}"><div id="${ifDefined(context._id)}-wrapper"	class="${ifDefined(classMap(context.classes.wrapper))}">	${ context._beginContent ? block1$5(context) : undefined }<input id="${ifDefined(context._id)}-inner"			class="sapWCInputBaseInner"			type="${ifDefined(context.inputType)}"			?disabled="${ifDefined(context.disabled)}"			?readonly="${ifDefined(context._readonly)}"			.value="${ifDefined(context.value)}"			placeholder="${ifDefined(context.inputPlaceholder)}"			@input="${ifDefined(context._input.onInput)}"			@change="${ifDefined(context._input.change)}"			data-sap-no-tab-ref			data-sap-focus-ref	/>		${ context.icon ? block2$5(context) : undefined }</div>	${ context.showSuggestions ? block3$2(context) : undefined }<slot name="formSupport"></slot></div>`; };
const block1$5 = (context) => { return html`<slot name="_beginContent"></slot>	`; };
const block2$5 = (context) => { return html`<slot name="icon"></slot>		`; };
const block3$2 = (context) => { return html`<ui5-popover				placement-type="Bottom"				no-header				no-arrow				horizontal-align="Stretch"				initial-focus="${ifDefined(context._id)}-inner"><ui5-list separators="Inner"><slot></slot></ui5-list></ui5-popover>	`; };

var styles$4 = ":host(ui5-input:not([hidden])){display:inline-block;width:100%}ui5-input:not([hidden]){display:inline-block;width:100%}.sapWCInputBase{height:var(--_ui5_input_height,2.25rem);background:transparent;position:relative;display:inline-block;vertical-align:top;outline:none;box-sizing:border-box;line-height:0}.sapWCInputBase.sapWCFocus .sapWCInputBaseContentWrapper:after{content:\"\";position:absolute;border:var(--_ui5_input_focus_border_width,1px) dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));pointer-events:none;top:1px;left:1px;right:1px;bottom:1px}.sapWCInputBase.sapWCInputBaseDisabled{opacity:var(--sap_wc_input_disabled_opacity,.4);cursor:default}.sapWCInputBaseInner{background:transparent;border:none;font-style:normal;-webkit-appearance:none;-moz-appearance:textfield;font-size:var(--sapMFontMediumSize,.875rem);font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));color:var(--sapUiFieldTextColor,var(--sapField_TextColor,var(--sapTextColor,var(--sapPrimary6,#32363a))));line-height:normal;padding:0 .75rem;box-sizing:border-box;min-width:3rem;text-overflow:ellipsis;flex:1;outline:none}.sapWCInputBaseInner::-webkit-input-placeholder{color:var(--sapUiFieldPlaceholderTextColor,#74777a)}.sapWCInputBaseInner::-moz-placeholder{color:var(--sapUiFieldPlaceholderTextColor,#74777a)}.sapWCInputBaseInner:-ms-input-placeholder{color:var(--sapUiFieldPlaceholderTextColor,#74777a)}.sapWCInputBaseInner:-moz-placeholder{color:var(--sapUiFieldPlaceholderTextColor,#74777a)}.sapWCInputBaseContentWrapper{height:100%;box-sizing:border-box;display:flex;flex-direction:row;justify-content:flex-end;position:relative;overflow:hidden;outline:none;background-color:var(--sapUiFieldBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))));border:1px solid var(--sapUiFieldBorderColor,var(--sapField_BorderColor,var(--sapPrimary5,#89919a)));border-radius:var(--_ui5_input_wrapper_border_radius,.125rem)}.sapWCInputBaseContentWrapper.sapWCInputBaseDisabledWrapper{pointer-events:none}.sapWCInputBaseContentWrapper.sapWCInputBaseReadonlyWrapper{border-color:var(--sapUiFieldReadOnlyBorderColor,var(--sapField_ReadOnly_BorderColor,var(--sapField_BorderColor,var(--sapPrimary5,#89919a))));background:var(--sapUiFieldReadOnlyBackground,var(--sapField_ReadOnly_Background,hsla(0,0%,94.9%,.5)))}.sapWCInputBaseContentWrapper:hover:not(.sapWCInputBaseContentWrapperError):not(.sapWCInputBaseContentWrapperWarning):not(.sapWCInputBaseContentWrapperSuccess):not(.sapWCInputBaseDisabledWrapper):not(.sapWCInputBaseReadonlyWrapper){background-color:var(--sapUiFieldHoverBackground,var(--sapField_Hover_Background,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border:1px solid var(--sapUiFieldHoverBorderColor,var(--sapField_Hover_BorderColor,var(--sapHighlightColor,#0854a0)))}.sapWCInputBaseDisabledWrapper{background:var(--sapUiFieldReadOnlyBackground,var(--sapField_ReadOnly_Background,hsla(0,0%,94.9%,.5)));border-color:var(--sapUiFieldReadOnlyBorderColor,var(--sapField_ReadOnly_BorderColor,var(--sapField_BorderColor,var(--sapPrimary5,#89919a))));-webkit-text-fill-color:var(--sapUiContentDisabledTextColor,var(--sapContent_DisabledTextColor,#32363a))}.sapWCInputBaseDisabledWrapper .sapWCInputBaseInner{color:var(--sapUiContentDisabledTextColor,var(--sapContent_DisabledTextColor,#32363a))}.sapWCInputBaseContentWrapperState{border-width:var(--_ui5_input_state_border_width,.125rem)}.sapWCInputBaseContentWrapperError .sapWCInputBaseInner,.sapWCInputBaseContentWrapperWarning .sapWCInputBaseInner{font-style:var(--_ui5_input_error_warning_font_style,normal)}.sapWCInputBaseContentWrapperError .sapWCInputBaseInner{font-weight:var(--_ui5_input_error_font_weight,normal)}.sapWCInputBaseContentWrapperError:not(.sapWCInputBaseReadonlyWrapper){background-color:var(--sapUiFieldInvalidBackground,var(--sapField_InvalidBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border-color:var(--sapUiFieldInvalidColor,var(--sapField_InvalidColor,var(--sapErrorBorderColor,var(--sapNegativeColor,#b00))))}.sapWCInputBaseContentWrapperError:not(.sapWCInputBaseReadonlyWrapper):not(.sapWCInputBaseDisabledWrapper),.sapWCInputBaseContentWrapperWarning:not(.sapWCInputBaseReadonlyWrapper):not(.sapWCInputBaseDisabledWrapper){border-style:var(--_ui5_input_error_warning_border_style,solid)}.sapWCInputBaseContentWrapperWarning:not(.sapWCInputBaseReadonlyWrapper){background-color:var(--sapUiFieldWarningBackground,var(--sapField_WarningBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border-color:var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapWarningBorderColor,var(--sapCriticalColor,#e9730c))))}.sapWCInputBaseContentWrapperSuccess:not(.sapWCInputBaseReadonlyWrapper){background-color:var(--sapUiFieldSuccessBackground,var(--sapField_SuccessBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border-color:var(--sapUiFieldSuccessColor,var(--sapField_SuccessColor,var(--sapSuccessBorderColor,var(--sapPositiveColor,#107e3e))))}.sapWCInputBaseInner::-ms-clear{height:0;width:0}.sapUiSizeCompact.sapWCInputBase{height:var(--_ui5_input_compact_height,1.625rem)}.sapUiSizeCompact .sapWCInputBaseInner{padding:0 .5rem}:host(ui5-input) ::slotted(ui5-icon){min-width:var(--sap_wc_input_icon_min_width,2.375rem)}ui5-input ui5-icon{min-width:var(--sap_wc_input_icon_min_width,2.375rem)}:host(ui5-input[data-ui5-compact-size]) ::slotted(ui5-icon){min-width:var(--sap_wc_input_compact_min_width,2rem)}ui5-input[data-ui5-compact-size] ui5-icon{min-width:var(--sap_wc_input_compact_min_width,2rem)}";

var shellbarInput = ":host(ui5-input[slot=searchField]) .sapWCInputBase .sapWCInputBaseContentWrapper{background-color:var(--sapUiShellColor,var(--sapShellColor,var(--sapPrimary1,#354a5f)));border:1px solid var(--sapUiShellBorderColorLighten30,#7996b4)}ui5-shellbar ui5-input[slot=searchField] .sapWCInputBase .sapWCInputBaseContentWrapper{background-color:var(--sapUiShellColor,var(--sapShellColor,var(--sapPrimary1,#354a5f)));border:1px solid var(--sapUiShellBorderColorLighten30,#7996b4)}:host(ui5-input[slot=searchField]) .sapWCInputBase .sapWCInputBaseContentWrapper:hover:not(.sapWCInputBaseContentWrapperError):not(.sapWCInputBaseContentWrapperWarning):not(.sapWCInputBaseContentWrapperSuccess):not(.sapWCInputBaseDisabledWrapper):not(.sapWCInputBaseReadonlyWrapper){background:var(--sapUiShellHoverBackground,#283848);border:1px solid var(--sapUiShellBorderColorLighten30,#7996b4)}ui5-shellbar ui5-input[slot=searchField] .sapWCInputBase .sapWCInputBaseContentWrapper:hover:not(.sapWCInputBaseContentWrapperError):not(.sapWCInputBaseContentWrapperWarning):not(.sapWCInputBaseContentWrapperSuccess):not(.sapWCInputBaseDisabledWrapper):not(.sapWCInputBaseReadonlyWrapper){background:var(--sapUiShellHoverBackground,#283848);border:1px solid var(--sapUiShellBorderColorLighten30,#7996b4)}:host(ui5-input[slot=searchField]) .sapWCInputBase .sapWCInputBaseInner{color:var(--sapUiShellTextColor,var(--sapShell_TextColor,#fff))}ui5-shellbar ui5-input[slot=searchField] .sapWCInputBase .sapWCInputBaseInner{color:var(--sapUiShellTextColor,var(--sapShell_TextColor,#fff))}:host(ui5-input[slot=searchField]) .sapWCInputBase.sapWCFocus .sapWCInputBaseContentWrapper:after{border:1px dotted var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}ui5-shellbar ui5-input[slot=searchField] .sapWCInputBase.sapWCFocus .sapWCInputBaseContentWrapper:after{border:1px dotted var(--sapUiContentContrastFocusColor,var(--sapContent_ContrastFocusColor,#fff))}:host(ui5-input[slot=searchField]) .sapUiSizeCompact.sapWCInput{height:2.25rem}ui5-shellbar ui5-input[slot=searchField] .sapUiSizeCompact.sapWCInput{height:2.25rem}";

/**
 * @public
 */
const metadata$a = {
	tag: "ui5-input",
	defaultSlot: "suggestionItems",
	slots: /** @lends sap.ui.webcomponents.main.Input.prototype */ {

		/**
		 * Defines the icon to be displayed in the <code>ui5-input</code>.
		 *
		 * @type {Icon}
		 * @slot
		 * @public
		 */
		icon: {
			type: Icon,
		},

		/**
		 * Defines the <code>ui5-input</code> suggestion items.
		 * </br></br>
		 * Example: </br>
		 * &lt;ui5-input show-suggestions></br>
		 * &nbsp;&nbsp;&nbsp;&nbsp;&lt;ui5-li>Item #1&lt;/ui5-li></br>
		 * &nbsp;&nbsp;&nbsp;&nbsp;&lt;ui5-li>Item #2&lt;/ui5-li></br>
		 * &lt;/ui5-input>
		 * <ui5-input show-suggestions><ui5-li>Item #1</ui5-li><ui5-li>Item #2</ui5-li></ui5-input>
		 * </br></br>
		 * <b>Note:</b> The suggestion would be displayed only if the <code>showSuggestions</code>
		 * property is set to <code>true</code>.
		 *
		 * @type {HTMLElement[]}
		 * @slot
		 * @public
		 */
		suggestionItems: {
			type: HTMLElement,
			multiple: true,
		},

		_beginContent: {
			type: HTMLElement,
		},
	},
	properties: /** @lends  sap.ui.webcomponents.main.Input.prototype */  {

		/**
		 * Defines whether <code>ui5-input</code> is in disabled state.
		 * <br><br>
		 * <b>Note:</b> A disabled <code>ui5-input</code> is completely uninteractive.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		disabled: {
			type: Boolean,
		},

		/**
		 * Defines a short hint intended to aid the user with data entry when the
		 * <code>ui5-input</code> has no value.
		 * <br><br>
		 * <b>Note:</b> The placeholder is not supported in IE. If the placeholder is provided, it won`t be displayed in IE.
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		placeholder: {
			type: String,
		},

		/**
		 * Defines whether the <code>ui5-input</code> is read-only.
		 * <br><br>
		 * <b>Note:</b> A read-only <code>ui5-input</code> is not editable,
		 * but still provides visual feedback upon user interaction.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		readonly: {
			type: Boolean,
		},

		/**
		 * Defines the HTML type of the <code>ui5-input</code>.
		 * Available options are: <code>Text</code>, <code>Email</code>,
		 * <code>Number</code>, <code>Password</code>, <code>Tel</code>, and <code>URL</code>.
		 * <br><br>
		 * <b>Notes:</b>
		 * <ul>
		 * <li>The particular effect of this property differs depending on the browser
		 * and the current language settings, especially for type <code>Number</code>.</li>
		 * <li>The property is mostly intended to be used with touch devices
		 * that use different soft keyboard layouts depending on the given input type.</li>
		 * </ul>
		 *
		 * @type {string}
		 * @defaultvalue "Text"
		 * @public
		 */
		type: {
			type: InputType,
			defaultValue: InputType.Text,
		},

		/**
		 * Defines the value of the <code>ui5-input</code>.
		 * <br><br>
		 * <b>Note:</b> The property is updated upon typing.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		value: {
			type: String,
		},

		/**
		 * Defines the value state of the <code>ui5-input</code>.
		 * Available options are: <code>None</code>, <code>Success</code>, <code>Warning</code>, and <code>Error</code>.
		 *
		 * @type {string}
		 * @defaultvalue "None"
		 * @public
		 */
		valueState: {
			type: ValueState,
			defaultValue: ValueState.None,
		},

		/**
		 * Determines the name with which the <code>ui5-input</code> will be submitted in an HTML form.
		 *
		 * <b>Important:</b> For the <code>name</code> property to have effect, you must add the following import to your project:
		 * <code>import InputElementsFormSupport from "@ui5/webcomponents/dist/InputElementsFormSupport";</code>
		 *
		 * <b>Note:</b> When set, a native <code>input</code> HTML element
		 * will be created inside the <code>ui5-input</code> so that it can be submitted as
		 * part of an HTML form. Do not use this property unless you need to submit a form.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		name: {
			type: String,
		},

		/**
		 * Defines whether the <code>ui5-input</code> should show suggestions, if such are present.
		 *
		 * @type {Boolean}
		 * @defaultvalue false
		 * @public
		 */
		showSuggestions: {
			type: Boolean,
		},

		_focused: {
			type: Boolean,
		},

		_input: {
			type: Object,
		},

		_popover: {
			type: Object,
		},
	},
	events: /** @lends  sap.ui.webcomponents.main.Input.prototype */ {
		/**
		 * Fired when the input operation has finished by pressing Enter or on focusout.
		 *
		 * @event
		 * @public
		 */
		change: {},

		/**
		 * Fired when the value of the <code>ui5-input</code> changes at each keystroke,
		 * and when a suggestion item has been selected.
		 *
		 * @event
		 * @public
		 */
		input: {},

		/**
		 * Fired when user presses Enter key on the <code>ui5-input</code>.
		 * <br><br>
		 * <b>Note:</b> The event is fired independent of whether there was a change before or not.
		 * If change was performed, the event is fired after the change event.
		 * The event is also fired when an item of the select list is selected by pressing Enter.
		 *
		 * @event
		 * @public
		 */
		submit: {},

		/**
		 * Fired when a suggestion item, which displayed in the suggestion popup, is selected.
		 *
		 * @event
		 * @param {HTMLElement} item The selected item
		 * @public
		 */
		suggestionItemSelect: {
			detail: {
				item: { type: HTMLElement },
			},
		},
	},
};

/**
 * @class
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-input</code> component allows the user to enter and edit text or numeric values in one line.
 * <br>
 * Additionally, you can provide <code>suggestionItems</code>,
 * that are displayed in a popover right under the input.
 * <br><br>
 * The text field can be editable or read-only (<code>readonly</code> property),
 * and and it can be enabled or disabled (<code>enabled</code> property).
 * To visualize semantic states, such as "error" or "warning", the <code>valueState</code> property is provided.
 * When the user makes changes to the text, the change event is fired,
 * which enables you to react on any text change.
 * <br><br>
 * <b>Note:</b> If you are using the <code>ui5-input</code> as a single npm module,
 * don"t forget to import the <code>Suggestions</code> module from
 * "@ui5/webcomponents/dist/Suggestions"
 * to enable the suggestions functionality.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/Input";</code>
 * <br>
 * <code>import "@ui5/webcomponents/dist/InputSuggestions";</code> (optional - for input suggestions support)
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.Input
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-input
 * @public
 */
class Input extends UI5Element {
	static get metadata() {
		return metadata$a;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$8;
	}

	static get styles() {
		return [styles$4, shellbarInput];
	}

	constructor() {
		super();
		// Indicates if there is selected suggestionItem.
		this.hasSuggestionItemSelected = false;

		// Represents the value before user moves selection between the suggestion items.
		// Used to register and fire "input" event upon [SPACE] or [ENTER].
		// Note: the property "value" is updated upon selection move and can`t be used.
		this.valueBeforeItemSelection = "";

		// tracks the value between focus in and focus out to detect that change event should be fired.
		this.previousValue = undefined;

		// Indicates, if the component is rendering for first time.
		this.firstRendering = true;

		// all sementic events
		this.EVENT_SUBMIT = "submit";
		this.EVENT_CHANGE = "change";
		this.EVENT_INPUT = "input";
		this.EVENT_SUGGESTION_ITEM_SELECT = "suggestionItemSelect";

		// all user interactions
		this.ACTION_ENTER = "enter";
		this.ACTION_USER_INPUT = "input";

		this._input = {
			onInput: this._onInput.bind(this),
			change: event => {
				this.fireEvent(this.EVENT_CHANGE);
			},
		};

		this._whenShadowRootReady().then(this.attachFocusHandlers.bind(this));
	}

	onBeforeRendering() {
		if (this.showSuggestions) {
			this.enableSuggestions();
		}

		const FormSupport = getFeature("FormSupport");
		if (FormSupport) {
			FormSupport.syncNativeHiddenInput(this);
		} else if (this.name) {
			console.warn(`In order for the "name" property to have effect, you should also: import InputElementsFormSupport from "@ui5/webcomponents/dist/InputElementsFormSupport";`); // eslint-disable-line
		}
	}

	onAfterRendering() {
		if (!this.firstRendering && this.Suggestions) {
			this.Suggestions.toggle(this.shouldOpenSuggestions());
		}
		this.firstRendering = false;
	}

	onkeydown(event) {
		if (isUp(event)) {
			return this._handleUp(event);
		}

		if (isDown(event)) {
			return this._handleDown(event);
		}

		if (isSpace(event)) {
			return this._handleSpace(event);
		}

		if (isEnter(event)) {
			return this._handleEnter(event);
		}
	}

	/* Event handling */
	_handleUp(event) {
		if (this.Suggestions) {
			this.Suggestions.onUp(event);
		}
	}

	_handleDown(event) {
		if (this.Suggestions) {
			this.Suggestions.onDown(event);
		}
	}

	_handleSpace(event) {
		if (this.Suggestions) {
			this.Suggestions.onSpace(event);
		}
	}

	_handleEnter(event) {
		const itemPressed = !!(this.Suggestions && this.Suggestions.onEnter(event));
		if (!itemPressed) {
			this.fireEventByAction(this.ACTION_ENTER);
		}
	}

	onfocusin() {
		this._focused = true; // invalidating property
		this.previousValue = this.value;
	}

	onfocusout() {
		this._focused = false; // invalidating property
		this.previousValue = "";
	}

	_onInput(event) {
		if (event.target === this.getInputDOMRef()) {
			// stop the native event, as the semantic "input" would be fired.
			event.stopImmediatePropagation();
		}

		this.fireEventByAction(this.ACTION_USER_INPUT);
		this.hasSuggestionItemSelected = false;

		if (this.Suggestions) {
			this.Suggestions.updateSelectedItemPosition(null);
		}
	}

	/* Private Methods */
	attachFocusHandlers() {
		this.shadowRoot.addEventListener("focusout", this.onfocusout.bind(this));
		this.shadowRoot.addEventListener("focusin", this.onfocusin.bind(this));
	}

	enableSuggestions() {
		if (this.Suggestions) {
			return;
		}

		const Suggestions = getFeature("InputSuggestions");
		if (Suggestions) {
			this.Suggestions = new Suggestions(this, "suggestionItems");
		} else {
			throw new Error(`You have to import "@ui5/webcomponents/dist/InputSuggestions.js" module to use ui5-input suggestions`);
		}
	}

	shouldOpenSuggestions() {
		return !!(this.suggestionItems.length
			&& this.showSuggestions
			&& this._focused
			&& !this.hasSuggestionItemSelected);
	}

	selectSuggestion(item, keyboardUsed) {
		const itemText = item.textContent;
		const fireInput = keyboardUsed
			? this.valueBeforeItemSelection !== itemText : this.value !== itemText;

		item.selected = false;
		this.hasSuggestionItemSelected = true;
		this.fireEvent(this.EVENT_SUGGESTION_ITEM_SELECT, { item });

		if (fireInput) {
			this.value = itemText;
			this.valueBeforeItemSelection = itemText;
			this.fireEvent(this.EVENT_INPUT);
			this.fireEvent(this.EVENT_CHANGE);
		}
	}

	previewSuggestion(item) {
		this.valueBeforeItemSelection = this.value;
		this.value = item.textContent;
	}

	fireEventByAction(action) {
		if (this.disabled || this.readonly) {
			return;
		}

		const inputValue = this.getInputValue();
		const isSubmit = action === this.ACTION_ENTER;
		const isUserInput = action === this.ACTION_USER_INPUT;

		this.value = inputValue;

		if (isUserInput) { // input
			this.fireEvent(this.EVENT_INPUT);
			return;
		}

		if (isSubmit) { // submit
			this.fireEvent(this.EVENT_SUBMIT);
		}

		// In IE, pressing the ENTER does not fire change
		const valueChanged = (this.previousValue !== undefined) && (this.previousValue !== this.value);
		if (isIE() && isSubmit && valueChanged) {
			this.fireEvent(this.EVENT_CHANGE);
		}
	}


	getInputValue() {
		const inputDOM = this.getDomRef();
		if (inputDOM) {
			return this.getInputDOMRef().value;
		}
		return "";
	}

	getInputDOMRef() {
		return this.getDomRef().querySelector(`#${this.getInputId()}`);
	}

	getLabelableElementId() {
		return this.getInputId();
	}

	getInputId() {
		return `${this._id}-inner`;
	}

	/* Suggestions interface  */
	onItemFocused() {}

	onItemSelected(item, keyboardUsed) {
		this.selectSuggestion(item, keyboardUsed);
	}

	onItemPreviewed(item) {
		this.previewSuggestion(item);
	}

	onOpen() {}

	onClose() {}

	get classes() {
		const hasState = this.valueState !== "None";

		return {
			main: {
				sapWCInputBase: true,
				sapWCInputBaseWidthPadding: true,
				sapWCInputBaseDisabled: this.disabled,
				sapWCInputBaseReadonly: this.readonly,
				sapWCInput: true,
				sapWCInputFocused: this._focused,
				sapWCFocus: this._focused,
				sapUiSizeCompact: getCompactSize(),
			},
			wrapper: {
				sapWCInputBaseContentWrapper: true,
				sapWCInputBaseDisabledWrapper: this.disabled,
				sapWCInputBaseReadonlyWrapper: this.readonly && !this.disabled,
				sapWCInputBaseContentWrapperState: hasState,
				[`sapWCInputBaseContentWrapper${this.valueState}`]: hasState,
			},
		};
	}

	get inputPlaceholder() {
		// We don`t support placeholder for IE,
		// because IE fires input events, when placeholder exists, leading to functional degredations.
		return isIE() ? "" : this.placeholder;
	}

	get _readonly() {
		return this.readonly && !this.disabled;
	}

	get inputType() {
		return this.type.toLowerCase();
	}

	get ariaInvalid() {
		return this.valueState === "Error" ? "true" : undefined;
	}
}

Bootstrap.boot().then(_ => {
	Input.define();
});

const block0$9 = (context) => { return html`<div		class="${ifDefined(classMap(context.classes.main))}"		style="${ifDefined(styleMap$1(context.styles.main))}"><!-- INPUT --><ui5-input			id="${ifDefined(context._id)}-inner"			placeholder="${ifDefined(context._input.placeholder)}"			type="${ifDefined(context._input.type)}"			value="${ifDefined(context.value)}"			?disabled="${ifDefined(context.disabled)}"			?readonly="${ifDefined(context.readonly)}"			value-state="${ifDefined(context.valueState)}"			@ui5-change="${ifDefined(context._input.onChange)}"			@ui5-input="${ifDefined(context._input.onLiveChange)}"			data-sap-focus-ref	>		${ !context.readonly ? block1$6(context) : undefined }</ui5-input><!-- POPOVER --><ui5-popover			id="${ifDefined(context._id)}-popover"			allow-target-overlap="${ifDefined(context._popover.allowTargetOverlap)}"			placement-type="${ifDefined(context._popover.placementType)}"			no-header			no-arrow			horizontal-align="${ifDefined(context._popover.horizontalAlign)}"			stay-open-on-scroll="${ifDefined(context._popover.stayOpenOnScroll)}"			@ui5-afterClose="${ifDefined(context._popover.afterClose)}"			@ui5-afterOpen="${ifDefined(context._popover.afterOpen)}"	><ui5-calendar				id="${ifDefined(context._id)}-calendar"				primary-calendar-type="${ifDefined(context._calendar.primaryCalendarType)}"				format-pattern="${ifDefined(context._calendar.formatPattern)}"				timestamp="${ifDefined(context._calendar.timestamp)}"				.selectedDates="${ifDefined(context._calendar.selectedDates)}"				@ui5-selectedDatesChange="${ifDefined(context._calendar.onSelectedDatesChange)}"		></ui5-calendar></ui5-popover><slot name="formSupport"></slot></div>`; };
const block1$6 = (context) => { return html`<ui5-icon				slot="icon"				src="${ifDefined(context._input.icon.src)}"				class="${ifDefined(classMap(context.classes.icon))}"				tabindex="-1"			></ui5-icon>		`; };

var datePickerCss = ":host(ui5-datepicker:not([hidden])){display:inline-block;width:100%}ui5-datepicker:not([hidden]){display:inline-block;width:100%}.sapWCDPIcon{color:var(--sapUiContentIconColor,var(--sapContent_IconColor,var(--sapHighlightColor,#0854a0)));cursor:pointer;outline:none;border:var(--_ui5_datepicker_icon_border,none);box-sizing:border-box}.sapWCDPIcon.sapWCDPIconPressed,.sapWCDPIcon:hover{border-left-color:#fff}.sapWCDPIcon:active{background-color:var(--sapUiButtonLiteActiveBackground,var(--sapUiButtonActiveBackground,var(--sapUiActive,var(--sapActiveColor,var(--sapHighlightColor,#0854a0)))));color:var(--sapUiButtonActiveTextColor,#fff)}.sapWCDPIcon.sapWCDPIconPressed{background:var(--sapUiToggleButtonPressedBackground,var(--sapUiSelected,var(--sapSelectedColor,var(--sapHighlightColor,#0854a0))));color:var(--sapUiButtonActiveTextColor,#fff)}.sapWCDPIcon:not(.sapWCDPIconPressed):not(:active):hover{background:var(--sapUiButtonLiteHoverBackground,var(--sapUiButtonHoverBackground,var(--sapButton_Hover_Background,#ebf5fe)))}";

/**
 * @public
 */
const metadata$b = {
	tag: "ui5-datepicker",
	properties: /** @lends  sap.ui.webcomponents.main.DatePicker.prototype */ {
		/**
		 * Defines a formatted date value.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		value: {
			type: String,
		},

		/**
		 * Visualizes the validation state of the Web Component, for example
		 * <code>Error</code>, <code>Warning</code> and
		 * <code>Success</code>.
		 *
		 * @type {string}
		 * @defaultvalue "None"
		 * @public
		 */
		valueState: {
			type: ValueState,
			defaultValue: ValueState.None,
		},

		/**
		 * Determines the format, displayed in the input field.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		formatPattern: {
			type: String,
		},

		/**
		 * Determines the calendar type.
		 * The input value is formated according to the calendar type and the picker shows
		 * months and years from the specified calendar. Available options are: "Gregorian", "Islamic", "Japanese", "Buddhist" and "Persian".
		 *
		 * @type {string}
		 * @public
		 */
		primaryCalendarType: {
			type: CalendarType$1,
		},

		/**
		 * Determines whether the <code>ui5-datepicker</code> is displayed as disabled.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		disabled: {
			type: Boolean,
		},

		/**
		 * Determines whether the <code>ui5-datepicker</code> is displayed as readonly.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		readonly: {
			type: Boolean,
		},

		/**
		 * Defines a short hint, intended to aid the user with data entry when the
		 * <code>ui5-datepicker</code> has no value.
		 * <br><br>
		 * <b>Note:</b> The placeholder is not supported in IE. If the placeholder is provided, it won`t be displayed in IE.
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		placeholder: {
			type: String,
		},

		/**
		 * Determines the name with which the <code>ui5-datepicker</code> will be submitted in an HTML form.
		 *
		 * <b>Important:</b> For the <code>name</code> property to have effect, you must add the following import to your project:
		 * <code>import InputElementsFormSupport from "@ui5/webcomponents/dist/InputElementsFormSupport";</code>
		 *
		 * <b>Note:</b> When set, a native <code>input</code> HTML element
		 * will be created inside the <code>ui5-datepicker</code> so that it can be submitted as
		 * part of an HTML form. Do not use this property unless you need to submit a form.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		name: {
			type: String,
		},

		_isPickerOpen: {
			type: Boolean,
		},

		_input: {
			type: Object,
		},
		_popover: {
			type: Object,
		},
		_calendar: {
			type: Object,
			deepEqual: true,
		},
	},
	events: /** @lends  sap.ui.webcomponents.main.DatePicker.prototype */ {

		/**
		 * Fired when the input operation has finished by pressing Enter or on focusout.
		 *
		 * @event
		 * @public
		*/
		change: {},

		/**
		 * Fired when the value of the <code>ui5-datepicker</code> is changed at each key stroke.
		 *
		 * @event
		 * @public
		*/
		input: {},
	},
};

/**
 * @class
 *
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-datepicker</code> component provides an input field with assigned calendar which opens on user action.
 * The <code>ui5-datepicker</code> allows users to select a localized date using touch,
 * mouse, or keyboard input. It consists of two parts: the date input field and the
 * date picker.
 *
 * <h3>Usage</h3>
 *
 * The user can enter a date by:
 * <ul><li>Using the calendar that opens in a popup</li>
 * <li>Typing it in directly in the input field</li></ul>
 * <br><br>
 * When the user makes an entry and chooses the enter key, the calendar shows the corresponding date.
 * When the user directly triggers the calendar display, the actual date is displayed.
 *
 * <h3>Formatting</h3>
 *
 * If a date is entered by typing it into
 * the input field, it must fit to the used date format.
 * <br><br>
 * Supported format options are pattern-based on Unicode LDML Date Format notation.
 * For more information, see <ui5-link target="_blank" href="http://unicode.org/reports/tr35/#Date_Field_Symbol_Table" class="api-table-content-cell-link">UTS #35: Unicode Locale Data Markup Language</ui5-link>.
 * <br><br>
 * For example, if the <code>format-pattern</code> is "yyyy-MM-dd",
 * a valid value string is "2015-07-30" and the same is displayed in the input.
 *
 * <h3>Keyboard Handling</h3>
 * The <code>ui5-datepicker</code> provides advanced keyboard handling.
 * If the <code>ui5-datepicker</code> is focused,
 * you can open or close the drop-down by pressing <code>F4</code>, <code>ALT+UP</code> or <code>ALT+DOWN</code> keys.
 * Once the drop-down is opened, you can use the <code>UP</code>, <code>DOWN</code>, <code>LEFT</code>, <code>right</code> arrow keys
 * to navigate through the dates and select one by pressing the <code>Space</code> or <code>Enter</code> keys. Moreover you can
 * use tab to reach the buttons for changing month and year.
 * <br>
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/DatePicker";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.DatePicker
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-datepicker
 * @public
 */
class DatePicker extends UI5Element {
	static get metadata() {
		return metadata$b;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$9;
	}

	static get styles() {
		return datePickerCss;
	}

	constructor() {
		super();
		this._input = {};
		this._input.type = InputType.Text;
		this._input.icon = {};
		this._input.icon.src = getIconURI("appointment-2");
		this._input.onChange = this._handleInputChange.bind(this);
		this._input.onLiveChange = this._handleInputLiveChange.bind(this);

		this._popover = {
			placementType: PopoverPlacementType.Bottom,
			horizontalAlign: PopoverHorizontalAlign.Left,
			allowTargetOverlap: true,
			stayOpenOnScroll: true,
			afterClose: () => {
				const shadowRoot = this.shadowRoot;
				const popover = shadowRoot.querySelector(`#${this._id}-popover`);
				const calendar = popover.querySelector(`#${this._id}-calendar`);

				this._input = Object.assign({}, this._input);
				this._isPickerOpen = false;

				if (this._focusInputAfterClose) {
					this._getInput().focus();
					this._focusInputAfterClose = false;
				}

				calendar._hideMonthPicker();
				calendar._hideYearPicker();
			},
			afterOpen: () => {
				const shadowRoot = this.shadowRoot;
				const popover = shadowRoot.querySelector(`#${this._id}-popover`);
				const calendar = popover.querySelector(`#${this._id}-calendar`);
				const dayPicker = calendar.shadowRoot.querySelector(`#${calendar._id}-daypicker`);

				const selectedDay = dayPicker.shadowRoot.querySelector(".sapWCDayPickerItemSel");
				const today = dayPicker.shadowRoot.querySelector(".sapWCDayPickerItemNow");
				const focusableDay = selectedDay || today;

				if (this._focusInputAfterOpen) {
					this._focusInputAfterOpen = false;
					this._getInput().focus();
				} else if (focusableDay) {
					focusableDay.focus();

					dayPicker._itemNav.current = parseInt(focusableDay.getAttribute("data-sap-index"));
					dayPicker._itemNav.update();
				}
			},
		};

		this._calendar = {
			onSelectedDatesChange: this._handleCalendarSelectedDatesChange.bind(this),
			selectedDates: [],
		};
	}

	onBeforeRendering() {
		this._input.placeholder = this.placeholder;
		this._input._iconNonFocusable = true;

		this._calendar.primaryCalendarType = this._primaryCalendarType;
		this._calendar.formatPattern = this._formatPattern;

		if (this.isValid(this.value)) {
			this._changeCalendarSelection();
		} else {
			this._calendar.selectedDates = [];
		}

		const FormSupport = getFeature("FormSupport");
		if (FormSupport) {
			FormSupport.syncNativeHiddenInput(this);
		} else if (this.name) {
			console.warn(`In order for the "name" property to have effect, you should also: import InputElementsFormSupport from "@ui5/webcomponents/dist/InputElementsFormSupport";`); // eslint-disable-line
		}
	}

	onclick(event) {
		const icon = this.shadowRoot.querySelector("ui5-icon");
		const isIconTab = (event.ui5target === icon);

		if (icon && (isIconTab || event.ui5target.contains(icon.getDomRef()))) {
			this.togglePicker();
		}
	}

	onkeydown(event) {
		if (isShow(event)) {
			this.togglePicker();
			this._getInput().focus();
		}
	}

	_getInput() {
		return this.shadowRoot.querySelector("ui5-input");
	}

	_handleInputChange() {
		let nextValue = this._getInput().getInputValue();
		const isValid = this.isValid(nextValue);

		if (isValid) {
			nextValue = this.normalizeValue(nextValue);
		}


		this.value = nextValue;
		this.fireEvent("change", { value: nextValue, valid: isValid });
	}

	_handleInputLiveChange() {
		const nextValue = this._getInput().getInputValue();
		const isValid = this.isValid(nextValue);

		this.value = nextValue;
		this.fireEvent("input", { value: nextValue, valid: isValid });
	}

	/**
	 * Checks if a value is valid against the current date format of the DatePicker
	 * @param {string} value A value to be tested against the current date format
	 * @public
	 */
	isValid(value = "") {
		return !!(value && this.getFormat().parse(value));
	}

	// because the parser understands more than one format
	// but we need values in one format
	normalizeValue(sValue) {
		return this.getFormat().format(this.getFormat().parse(sValue));
	}

	get validValue() {
		if (this.isValid(this.value)) {
			return this.value;
		}
		return this.getFormat().format(new Date());
	}

	get _calendarDate() {
		const millisecondsUTC = this.getFormat().parse(this.validValue, true).getTime();
		const oCalDate = CalendarDate.fromTimestamp(
			millisecondsUTC - (millisecondsUTC % (24 * 60 * 60 * 1000)),
			this._primaryCalendarType
		);
		return oCalDate;
	}

	get _primaryCalendarType() {
		return this.primaryCalendarType || getCalendarType() || LocaleData.getInstance(getLocale$1()).getPreferredCalendarType();
	}

	get _formatPattern() {
		return this.formatPattern || "medium"; // get from config
	}

	get _isPattern() {
		return this._formatPattern !== "medium" && this._formatPattern !== "short" && this._formatPattern !== "long";
	}

	getFormat() {
		if (this._isPattern) {
			this._oDateFormat = DateFormat.getInstance({
				pattern: this._formatPattern,
				calendarType: this._primaryCalendarType,
			});
		} else {
			this._oDateFormat = DateFormat.getInstance({
				style: this._formatPattern,
				calendarType: this._primaryCalendarType,
			});
		}
		return this._oDateFormat;
	}

	_getPopover() {
		return this.shadowRoot.querySelector("ui5-popover");
	}

	_iconPress() {
		this.togglePicker();
	}

	_canOpenPicker() {
		return !this.disabled && !this.readonly;
	}

	_handleCalendarSelectedDatesChange(event) {
		const iNewValue = event.detail.dates && event.detail.dates[0];

		if (this._calendar.selectedDates.indexOf(iNewValue) !== -1) {
			this.closePicker();
			return;
		}

		this.value = this.getFormat().format(
			new Date(CalendarDate.fromTimestamp(
				iNewValue * 1000,
				this._primaryCalendarType
			).valueOf()),
			true
		);
		this._calendar.timestamp = iNewValue;
		this._calendar.selectedDates = event.detail.dates;

		this._focusInputAfterClose = true;
		this.closePicker();

		this.fireEvent("change", { value: this.value, valid: true });
	}

	/**
	 * Closes the picker.
	 * @public
	 */
	closePicker() {
		this._getPopover().close();
	}

	/**
	 * Opens the picker.
	 * @param {object} options A JSON object with additional configuration.<br>
	 * <code>{ focusInput: true }</code> By default, the focus goes in the picker after opening it.
	 * Specify this option to focus the input field.
	 * @public
	 */
	openPicker(options) {
		this._changeCalendarSelection();
		this._input = Object.assign({}, this._input);

		if (options && options.focusInput) {
			this._focusInputAfterOpen = true;
		}

		this._getPopover().openBy(this);
		this._isPickerOpen = true;
	}

	togglePicker() {
		if (this.isOpen()) {
			this.closePicker();
		} else if (this._canOpenPicker()) {
			this.openPicker();
		}
	}

	_changeCalendarSelection() {
		if (this._calendarDate.getYear() < 1) {
			// 0 is a valid year, but we cannot display it
			return;
		}

		const oCalDate = this._calendarDate;
		const timestamp = oCalDate.valueOf() / 1000;

		this._calendar = Object.assign({}, this._calendar);
		this._calendar.timestamp = timestamp;
		if (this.value) {
			this._calendar.selectedDates = [timestamp];
		}
	}

	/**
	 * Checks if the picker is open.
	 * @returns {Boolean} true if the picker is open, false otherwise
	 * @public
	 */
	isOpen() {
		return !!this._isPickerOpen;
	}

	/**
	 * Gets some semantic details about an event originated in the control.
	 * @param {*} event An event object
	 * @returns {Object} Semantic details
	 */
	getSemanticTargetInfo(event) {
		const oDomTarget = getDomTarget(event);
		let isInput = false;

		if (oDomTarget && oDomTarget.className.indexOf("sapWCInputBaseInner") > -1) {
			isInput = true;
		}

		return { isInput };
	}

	get classes() {
		return {
			main: {
				sapMDP: true,
			},
			icon: {
				sapWCDPIcon: true,
				sapWCDPIconPressed: this._isPickerOpen,
			},
		};
	}

	get styles() {
		return {
			main: {
				width: "100%",
			},
		};
	}

	static async define(...params) {
		await Promise.all([
			fetchCldrData(getLocale$1().getLanguage(), getLocale$1().getRegion(), getLocale$1().getScript()),
			Icon.define(),
			Popover.define(),
			Calendar.define(),
			Input.define(),
		]);

		super.define(...params);
	}
}

const getDomTarget = event => {
	let target,
		composedPath;

	if (typeof event.composedPath === "function") {
		composedPath = event.composedPath();
	}

	if (Array.isArray(composedPath) && composedPath.length) {
		target = composedPath[0];
	}

	return target;
};

Bootstrap.boot().then(_ => {
	DatePicker.define();
});

class CSSSize extends DataType {
	static isValid(value) {
		return /^(auto|inherit|[-+]?(0*|([0-9]+|[0-9]*\.[0-9]+)([rR][eE][mM]|[eE][mM]|[eE][xX]|[pP][xX]|[cC][mM]|[mM][mM]|[iI][nN]|[pP][tT]|[pP][cC]|%))|calc\(\s*(\(\s*)*[-+]?(([0-9]+|[0-9]*\.[0-9]+)([rR][eE][mM]|[eE][mM]|[eE][xX]|[pP][xX]|[cC][mM]|[mM][mM]|[iI][nN]|[pP][tT]|[pP][cC]|%)?)(\s*(\)\s*)*(\s[-+]\s|[*\/])\s*(\(\s*)*([-+]?(([0-9]+|[0-9]*\.[0-9]+)([rR][eE][mM]|[eE][mM]|[eE][xX]|[pP][xX]|[cC][mM]|[mM][mM]|[iI][nN]|[pP][tT]|[pP][cC]|%)?)))*\s*(\)\s*)*\))$/.test(value); // eslint-disable-line
	}
}

const block0$a = (context) => { return html`<div	class="${ifDefined(classMap(context.classes.main))}"	style="${ifDefined(styleMap$1(context.styles.main))}"	?aria-invalid="${ifDefined(context.ariaInvalid)}">	${ context.growing ? block1$7(context) : undefined }<div class="${ifDefined(classMap(context.classes.focusDiv))}" style="${ifDefined(styleMap$1(context.styles.inner))}"><textarea			id="${ifDefined(context._id)}-inner"			class="${ifDefined(classMap(context.classes.inner))}"			placeholder="${ifDefined(context.placeholder)}"			?disabled="${ifDefined(context.disabled)}"			?readonly="${ifDefined(context.readonly)}"			maxlength="${ifDefined(context._exceededTextProps.calcedMaxLength)}"			.value="${ifDefined(context.value)}"			@change="${ifDefined(context._listeners.change)}"			data-sap-focus-ref></textarea></div>	${ context.showExceededText ? block4$2(context) : undefined }<slot name="formSupport"></slot></div>`; };
const block1$7 = (context) => { return html`<div id="${ifDefined(context._id)}-mirror" style="${ifDefined(styleMap$1(context.styles.mirror))}" class="${ifDefined(classMap(context.classes.mirror))}" aria-hidden="true">			${ repeat(context._mirrorText, undefined, (item, index) => block2$6(item, index, context)) }</div>	`; };
const block2$6 = (item, index, context) => { return html`${ifDefined(item.text)}${ !item.last ? block3$3(item, index, context) : undefined }`; };
const block3$3 = (item, index, context) => { return html`<br/>				`; };
const block4$2 = (context) => { return html`<span class="${ifDefined(classMap(context.classes.exceededText))}">${ifDefined(context._exceededTextProps.exceededText)}</span>	`; };

const TEXTAREA_CHARACTERS_LEFT = {
	key: "TEXTAREA_CHARACTERS_LEFT",
	defaultText: "{0} characters remaining",
};

const TEXTAREA_CHARACTERS_EXCEEDED = {
	key: "TEXTAREA_CHARACTERS_EXCEEDED",
	defaultText: "{0} characters over limit",
};

var styles$5 = ":host(ui5-textarea:not([hidden])){display:inline-block}ui5-textarea:not([hidden]){display:inline-block}.sapWCTextArea{height:3rem;background:transparent;display:inline-flex;vertical-align:top;outline:none;position:relative;overflow:hidden;box-sizing:border-box}.sapWCTextArea:not(.sapWCTextAreaDisabled):not(.sapWCTextAreaWarning):hover .sapWCTextAreaInner{border:1px solid var(--sapUiFieldHoverBorderColor,var(--sapField_Hover_BorderColor,var(--sapHighlightColor,#0854a0)))}.sapWCTextArea.sapWCTextAreaReadonly .sapWCTextAreaInner{background:var(--sapUiFieldReadOnlyBackground,var(--sapField_ReadOnly_Background,hsla(0,0%,94.9%,.5)))}.sapWCTextAreaMirror~.sapWCTextAreaFocusDiv{height:100%;width:100%;top:0;position:absolute}.sapWCTextAreaGrowing.sapWCTextAreaNoMaxLines .sapWCTextAreaFocusDiv,.sapWCTextAreaGrowing.sapWCTextAreaNoMaxLines .sapWCTextAreaMirror{overflow:hidden}.sapWCTextAreaMirror{line-height:1.4;visibility:hidden;width:100%;word-break:break-all;padding:.5625rem .6875rem;font-size:var(--sapMFontMediumSize,.875rem);font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));white-space:pre-wrap;box-sizing:border-box}.sapWCTextAreaInner{width:100%;margin:0;padding:.5625rem .6875rem;line-height:1.4;box-sizing:border-box;color:var(--sapUiFieldTextColor,var(--sapField_TextColor,var(--sapTextColor,var(--sapPrimary6,#32363a))));background:var(--sapUiFieldBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff))));border:1px solid var(--sapUiFieldBorderColor,var(--sapField_BorderColor,var(--sapPrimary5,#89919a)));outline:none;font-size:var(--sapMFontMediumSize,.875rem);font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));-webkit-appearance:none;-moz-appearance:textfield;overflow:auto;resize:none}.sapWCTextAreaHasFocus:after{content:\"\";border:var(--_ui5_textarea_focus_after_width,1px) dotted var(--sapUiContentFocusColor,var(--sapContent_FocusColor,#000));position:absolute;top:2px;left:2px;right:2px;bottom:2px;pointer-events:none}.sapWCTextAreaWarning .sapWCTextAreaHasFocus:after{top:3px;left:3px;right:3px;bottom:3px}.sapWCTextAreaGrowing.sapWCTextAreaNoCols .sapWCTextAreaFocusDiv{overflow:hidden;width:100%}.sapWCTextAreaInner::-webkit-input-placeholder{font-size:var(--sapMFontMediumSize,.875rem);font-style:italic}.sapWCTextAreaInner::-moz-placeholder{font-size:var(--sapMFontMediumSize,.875rem);font-style:italic}.sapWCTextAreaInner:-ms-input-placeholder{font-size:var(--sapMFontMediumSize,.875rem);font-style:italic}.sapWCTextAreaWithCounter{flex-direction:column;display:flex}.sapWCTextAreaWithCounter .sapWCTextAreaExceededText{overflow:hidden;align-self:flex-end;padding:.125rem .125rem .5rem;color:var(--sapUiContentLabelColor,var(--sapContent_LabelColor,var(--sapPrimary7,#6a6d70)));font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif));font-size:var(--sapMFontSmallSize,.75rem)}.sapWCTextAreaCounter{text-align:right;font-size:var(--sapMFontMediumSize,.875rem);font-family:var(--sapUiFontFamily,var(--sapFontFamily,\"72\",\"72full\",Arial,Helvetica,sans-serif))}.sapWCTextAreaWarningInner{border-width:var(--_ui5_textarea_warning_border_width,2px);border-style:var(--_ui5_textarea_warning_border_style,solid);background:var(--sapUiFieldWarningBackground,var(--sapField_WarningBackground,var(--sapField_Background,var(--sapBaseColor,var(--sapPrimary3,#fff)))));border-color:var(--sapUiFieldWarningColor,var(--sapField_WarningColor,var(--sapWarningBorderColor,var(--sapCriticalColor,#e9730c))))}.sapWCTextAreaContent{display:flex;flex-direction:column;height:100%}.sapWCTextAreaDisabled{opacity:.5;user-select:none;-moz-user-select:none;-ms-user-select:none;-webkit-user-select:none}.sapWCTextAreaFocusDiv{display:flex;width:100%;height:100%;position:relative}";

/**
 * @public
 */
const metadata$c = {
	tag: "ui5-textarea",
	properties: /** @lends sap.ui.webcomponents.main.TextArea.prototype */ {
		/**
		 * Defines the value of the Web Component.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		value: {
			type: String,
		},

		/**
		 * Indicates whether the user can interact with the component or not.
		 * <br><br>
		 * <b>Note:</b> Disabled components cannot be focused and they are out of the tab chain.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		disabled: {
			type: Boolean,
		},

		/**
		 * Defines whether the <code>ui5-textarea</code> is readonly.
		 * </br></br>
		 * <b>Note:</b> A readonly <code>ui5-textarea</code> is not editable,
		 * but still provides visual feedback upon user interaction.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		readonly: {
			type: Boolean,
		},

		/**
		 * Defines a short hint intended to aid the user with data entry when the component has no value.
		 *
		 * @type {string}
		 * @defaultvalue ""
		 * @public
		 */
		placeholder: {
			type: String,
		},

		/**
		 * Defines the number of visible text lines for the component.
		 * <br><br>
		 * <b>Notes:</b>
		 * <ul>
		 * <li>If the <code>growing</code> property is enabled, this property defines the minimum rows to be displayed
		 * in the textarea.</li>
		 * <li>The CSS <code>height</code> property wins over the <code>rows</code> property, if both are set.</li>
		 * </ul>
		 *
		 * @type {number}
		 * @defaultvalue 0
		 * @public
		 */
		rows: {
			type: Integer,
			defaultValue: 0,
		},

		/**
		 * Defines the maximum number of characters that the <code>value</code> can have.
		 *
		 * @type {number}
		 * @public
		 */
		maxLength: {
			type: Integer,
			defaultValue: null,
		},

		/**
		 * Determines whether the characters exceeding the maximum allowed character count are visible
		 * in the <code>ui5-textarea</code>.
		 * <br><br>
		 * If set to <code>false</code>, the user is not allowed to enter more characters than what is set in the
		 * <code>maxLength</code> property.
		 * If set to <code>true</code> the characters exceeding the <code>maxLength</code> value are selected on
		 * paste and the counter below the <code>ui5-textarea</code> displays their number.
		 *
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		showExceededText: {
			type: Boolean,
		},

		/**
		 * Enables the <code>ui5-textarea</code> to automatically grow and shrink dynamically with its content.
		 * <br><br>
		 * <b>Note:</b> If set to <code>true</code>, the CSS <code>height</code> property is ignored.
		 * @type {boolean}
		 * @defaultvalue false
		 * @public
		 */
		growing: {
			type: Boolean,
		},

		/**
		 * Defines the maximum number of lines that the Web Component can grow.
		 *
		 * @type {number}
		 * @defaultvalue 0
		 * @public
		 */
		growingMaxLines: {
			type: Integer,
			defaultValue: 0,
		},

		/**
		 * Determines the name with which the <code>ui5-textarea</code> will be submitted in an HTML form.
		 *
		 * <b>Important:</b> For the <code>name</code> property to have effect, you must add the following import to your project:
		 * <code>import InputElementsFormSupport from "@ui5/webcomponents/dist/InputElementsFormSupport";</code>
		 *
		 * <b>Note:</b> When set, a native <code>input</code> HTML element
		 * will be created inside the <code>ui5-textarea</code> so that it can be submitted as
		 * part of an HTML form. Do not use this property unless you need to submit a form.
		 *
		 * @type {string}
		 * @defaultvalue: ""
		 * @public
		 */
		name: {
			type: String,
		},

		_height: {
			type: CSSSize,
			defaultValue: null,
		},

		_exceededTextProps: {
			type: Object,
			defaultValue: null,
		},

		_mirrorText: {
			type: Object,
			multiple: true,
			defaultValue: "",
		},
		_maxHeight: {
			type: String,
		},
		_focussed: {
			type: Boolean,
		},
		_listeners: {
			type: Object,
		},
	},
	events: /** @lends sap.ui.webcomponents.main.TextArea.prototype */ {
		/**
		 * Fired when the text has changed and the focus leaves the <code>ui5-textarea</code>.
		 *
		 * @event
		 * @public
		 */
		change: {},
	},
};

/**
 * @class
 *
 * <h3 class="comment-api-title">Overview</h3>
 *
 * The <code>ui5-textarea</code> component provides large spaces for text
 * entries in the form of multiple rows.
 * It has the functionality of the <code>TextField</code> with the additional
 * functionality for multiline texts.
 * <br><br>
 * When empty, it can hold a placeholder similar to a <code>ui5-input</code>.
 * You can define the rows of the <code>ui5-textarea</code> and also determine specific behavior when handling long texts.
 *
 * <h3>ES6 Module Import</h3>
 *
 * <code>import "@ui5/webcomponents/dist/TextArea";</code>
 *
 * @constructor
 * @author SAP SE
 * @alias sap.ui.webcomponents.main.TextArea
 * @extends sap.ui.webcomponents.base.UI5Element
 * @tagname ui5-textarea
 * @public
 */
class TextArea extends UI5Element {
	static get metadata() {
		return metadata$c;
	}

	static get styles() {
		return styles$5;
	}

	static get render() {
		return litRender;
	}

	static get template() {
		return block0$a;
	}

	constructor() {
		super();

		this.resourceBundle = getResourceBundle("@ui5/webcomponents");

		this._listeners = {
			change: this._handleChange.bind(this),
		};
	}

	onBeforeRendering() {
		this._exceededTextProps = this._calcExceededText();
		this._mirrorText = this._tokenizeText(this.value);

		if (this.growingMaxLines) {
			// this should be complex calc between line height and paddings - TODO: make it stable
			this._maxHeight = `${this.growingMaxLines * 1.4 * 14 + 9}px`;
		}

		const FormSupport = getFeature("FormSupport");
		if (FormSupport) {
			FormSupport.syncNativeHiddenInput(this);
		} else if (this.name) {
			console.warn(`In order for the "name" property to have effect, you should also: import InputElementsFormSupport from "@ui5/webcomponents/dist/InputElementsFormSupport";`); // eslint-disable-line
		}
	}

	getInputDomRef() {
		return this.getDomRef().querySelector("textarea");
	}

	getInputValue() {
		const inputDOM = this.getDomRef();

		if (inputDOM) {
			return this.getInputDomRef().value;
		}

		return "";
	}

	oninput() {
		const inputValue = this.getInputValue();

		this.value = inputValue;
	}

	onfocusin() {
		this._focussed = true;
	}

	onfocusout() {
		this._focussed = false;
	}

	_handleChange() {
		this.fireEvent("change", {});
	}

	_tokenizeText(value) {
		const tokenizedText = value.replace(/&/gm, "&amp;").replace(/"/gm, "&quot;").replace(/"/gm, "&#39;").replace(/</gm, "&lt;")
			.replace(/>/gm, "&gt;")
			.split("\n");

		if (tokenizedText.length < this.rows) {
			return this._mapTokenizedTextToObject([...tokenizedText, ...Array(this.rows - tokenizedText.length).fill("")]);
		}

		return this._mapTokenizedTextToObject(tokenizedText);
	}

	_mapTokenizedTextToObject(tokenizedText) {
		return tokenizedText.map((token, index) => {
			return {
				text: token,
				last: index === (tokenizedText.length - 1),
			};
		});
	}

	_calcExceededText() {
		let calcedMaxLength,
			exceededText,
			leftCharactersCount;

		if (this.showExceededText) {
			const maxLength = this.maxLength || 0;

			if (maxLength) {
				leftCharactersCount = maxLength - this.value.length;

				if (leftCharactersCount >= 0) {
					exceededText = this.resourceBundle.getText(TEXTAREA_CHARACTERS_LEFT, [leftCharactersCount]);
				} else {
					exceededText = this.resourceBundle.getText(TEXTAREA_CHARACTERS_EXCEEDED, [Math.abs(leftCharactersCount)]);
				}
			}
		} else {
			calcedMaxLength = this.maxLength;
		}

		return {
			exceededText, leftCharactersCount, calcedMaxLength,
		};
	}

	get classes() {
		return {
			main: {
				sapWCTextArea: true,
				sapWCTextAreaWarning: (this._exceededTextProps.leftCharactersCount < 0),
				sapWCTextAreaGrowing: this.growing,
				sapWCTextAreaNoMaxLines: !this.growingMaxLines,
				sapWCTextAreaWithCounter: this.showExceededText,
				sapWCTextAreaDisabled: this.disabled,
				sapWCTextAreaReadonly: this.readonly,
			},
			inner: {
				sapWCTextAreaInner: true,
				sapWCTextAreaStateInner: (this._exceededTextProps.leftCharactersCount < 0),
				sapWCTextAreaWarningInner: (this._exceededTextProps.leftCharactersCount < 0),
			},
			exceededText: {
				sapWCTextAreaExceededText: true,
			},
			mirror: {
				sapWCTextAreaMirror: true,
			},
			focusDiv: {
				sapWCTextAreaFocusDiv: true,
				sapWCTextAreaHasFocus: this._focussed,
			},
		};
	}

	get styles() {
		const lineHeight = 1.4 * 16;

		return {
			mirror: {
				"max-height": this._maxHeight,
			},
			main: {
				width: "100%",
				height: (this.rows && !this.growing) ? `${this.rows * lineHeight}px` : "100%",
			},
			focusDiv: {
				"height": (this.showExceededText ? "calc(100% - 26px)" : "100%"),
				"max-height": (this._maxHeight),
			},
		};
	}

	get tabIndex() {
		return this.disabled ? undefined : "0";
	}

	get ariaInvalid() {
		return this.valueState === "Error" ? "true" : undefined;
	}

	static async define(...params) {
		await fetchResourceBundle("@ui5/webcomponents");

		super.define(...params);
	}
}

Bootstrap.boot().then(_ => {
	TextArea.define();
});

class FormSupport {
	/**
	 *
	 * @param element - the WebComponent that needs form support
	 * @param nativeInputUpdateCallback - determines how the native input's disabled and value properties are calculated
	 */
	static syncNativeHiddenInput(element, nativeInputUpdateCallback) {
		const needsNativeInput = !!element.name;
		let nativeInput = element.querySelector("input[type=hidden][data-ui5-webcomponents-form-support]");
		if (needsNativeInput && !nativeInput) {
			nativeInput = document.createElement("input");
			nativeInput.type = "hidden";
			nativeInput.setAttribute("data-ui5-webcomponents-form-support", "");
			nativeInput.slot = "formSupport"; // Needed for IE - otherwise input elements are not part of the real DOM tree and are not detected by forms
			element.appendChild(nativeInput);
		}
		if (!needsNativeInput && nativeInput) {
			element.removeChild(nativeInput);
		}

		if (needsNativeInput) {
			nativeInput.name = element.name;
			(nativeInputUpdateCallback || copyDefaultProperties)(element, nativeInput);
		}
	}

	static triggerFormSubmit(element) {
		if (!element.submits) {
			return;
		}
		let parentElement;
		do {
			parentElement = element.parentElement;
		} while (parentElement && parentElement.tagName.toLowerCase() !== "form");
		if (parentElement) {
			parentElement.submit();
		}
	}
}


const copyDefaultProperties = (element, nativeInput) => {
	nativeInput.disabled = element.disabled;
	nativeInput.value = element.value;
};

// Add form support to the global features registry so that Web Components can find and use it
registerFeature("FormSupport", FormSupport);

// ESM bundle targets Edge + browsers with native support
window.RenderScheduler = RenderScheduler;
window.isIE = isIE; // attached to the window object for testing purposes
window["sap-ui-webcomponents-main-bundle"] = {
	configuration: Configuration,
	Theming,
};
//# sourceMappingURL=bundle.esm.js.map
