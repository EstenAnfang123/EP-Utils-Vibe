/* global QUnit */
QUnit.config.autostart = false;

// eslint-disable-next-line no-undef
sap.ui.getCore().attachInit(function () {
	"use strict";

	// eslint-disable-next-line no-undef
	sap.ui.require([
		"sap/ui/demo/basicTemplate/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
