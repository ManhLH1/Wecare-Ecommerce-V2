/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
var pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad;
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./IconFontAwesome/index.ts":
/*!**********************************!*\
  !*** ./IconFontAwesome/index.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   IconFontAwesome: () => (/* binding */ IconFontAwesome)\n/* harmony export */ });\nclass IconFontAwesome {\n  /**\n   * Empty constructor.\n   */\n  constructor() {\n    // Empty\n  }\n  /**\n   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.\n   * Data-set values are not initialized here, use updateView.\n   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.\n   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.\n   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.\n   * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.\n   */\n  init(context, notifyOutputChanged, state, container) {\n    // Inject FontAwesome CDN nếu chưa có\n    if (!document.getElementById(\"fa-cdn\")) {\n      var link = document.createElement(\"link\");\n      link.id = \"fa-cdn\";\n      link.rel = \"stylesheet\";\n      link.href = \"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css\";\n      document.head.appendChild(link);\n    }\n    this._container = container;\n  }\n  /**\n   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.\n   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions\n   */\n  updateView(context) {\n    var html = context.parameters.iconHtml.raw || \"\";\n    var iconSize = context.parameters.iconSize && context.parameters.iconSize.raw != null ? context.parameters.iconSize.raw : null;\n    if (iconSize && html) {\n      // Chỉ áp dụng cho thẻ <i> đầu tiên\n      html = html.replace(/<i([^>]*)style=[\"']([^\"']*)[\"']([^>]*)>/i, (match, p1, style, p3) => {\n        if (/font-size\\s*:\\s*[^;]+;?/i.test(style)) return match;\n        return \"<i\".concat(p1, \"style=\\\"\").concat(style, \"; font-size: \").concat(iconSize, \"px;\\\"\").concat(p3, \">\");\n      });\n      html = html.replace(/<i((?!style)[^>]*)>/i, (match, p1) => {\n        if (/style=/i.test(match)) return match;\n        return \"<i\".concat(p1, \" style=\\\"font-size: \").concat(iconSize, \"px;\\\">\");\n      });\n    }\n    this._container.innerHTML = html;\n  }\n  /**\n   * It is called by the framework prior to a control receiving new data.\n   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as \"bound\" or \"output\"\n   */\n  getOutputs() {\n    return {};\n  }\n  /**\n   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.\n   * i.e. cancelling any pending remote calls, removing listeners, etc.\n   */\n  destroy() {\n    // Add code to cleanup control if necessary\n  }\n}\n\n//# sourceURL=webpack://pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad/./IconFontAwesome/index.ts?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The require scope
/******/ 	var __webpack_require__ = {};
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./IconFontAwesome/index.ts"](0, __webpack_exports__, __webpack_require__);
/******/ 	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = __webpack_exports__;
/******/ 	
/******/ })()
;
if (window.ComponentFramework && window.ComponentFramework.registerControl) {
	ComponentFramework.registerControl('CustomComponent.IconFontAwesome', pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.IconFontAwesome);
} else {
	var CustomComponent = CustomComponent || {};
	CustomComponent.IconFontAwesome = pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad.IconFontAwesome;
	pcf_tools_652ac3f36e1e4bca82eb3c1dc44e6fad = undefined;
}