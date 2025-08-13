// eslint-disable-next-line no-undef
sap.ui.define(
	["sap/ui/core/mvc/Controller", "sap/m/MessageToast", "sap/ui/model/json/JSONModel"],
	function (Controller, MessageToast, JSONModel) {
		"use strict";

		return Controller.extend("sap.ui.demo.basicTemplate.controller.App", {
			onInit: function () {},

			onDataExport: function () {
				// sap.m.URLHelper.redirect("https://login.live.com/oauth20_authorize.srf?client_id=f9671401-bd80-4952-88f4-84737913b41b&scope=offline_access%20files.readwrite&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000");
				sap.m.URLHelper.redirect("https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?client_id=f9671401-bd80-4952-88f4-84737913b41b&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000&response_mode=query&scope=offline_access%20files.readwrite&state=12345");
				// fetch("/api/v1/esoutil4/exceldata", { method: "POST" });
				/*.then(resp => resp.blob())
					.then(blob => {
						const url = window.URL.createObjectURL(blob);
						const a = document.createElement("a");
						a.style.display = "none";
						a.href = url;
						a.download = "Projekty.xlsx";
						document.body.appendChild(a);
						a.click();
						window.URL.revokeObjectURL(url);
					})
					.catch(err => console.log(err));*/
				// sap.m.URLHelper.redirect("/api/v1/esoutil4/exceldata");
			},

			onNavBack: function () {
				const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("main");
			},
		});
	}
);
