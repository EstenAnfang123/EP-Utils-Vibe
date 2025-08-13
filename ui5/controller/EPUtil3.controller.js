// eslint-disable-next-line no-undef
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel"
], function (Controller,MessageToast, JSONModel) {
	"use strict";

	return Controller.extend("sap.ui.demo.basicTemplate.controller.App", {

		onInit: function () {
			
		},

		onSearch: function () {
			// eslint-disable-next-line no-undef
			sap.ui.core.BusyIndicator.show(0);
			const issueId = this.getView().byId("issueIdInput").getValue();
			const oModelData = new JSONModel();
			
			oModelData.loadData("/issue_time_report/" + issueId);
			oModelData.attachRequestCompleted(oEvent => {
				if(oEvent.getParameter("success")){
					this.getView().setModel(oEvent.getSource(), "issue");
					this.jsonDisplay(oEvent.getSource());
				}
				else{
					MessageToast.show("Issue " + issueId + " se nepodařilo načíst.");
				}
				
				//REVIEW
				// eslint-disable-next-line no-undef
				sap.ui.core.BusyIndicator.hide();
			});

			// oModelData.attachRequestFailed(() =>{
			// 	console.log("failed to load issue " + issueId);
			// 	// eslint-disable-next-line no-undef
			// 	sap.ui.core.BusyIndicator.hide();
			// });
			
		},

		onNavBack: function () {
			// const oHistory = History.getInstance();
			// const sPreviousHash = oHistory.getPreviousHash();

			// if (sPreviousHash !== undefined) {
			// 	window.history.go(-1);
			// } else {
			// eslint-disable-next-line no-undef
			const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
			oRouter.navTo("main");
			// }
		},

		jsonDisplay : function(oContext){
			var oModelContext = new JSONModel();
			var contextStringify = JSON.stringify(oContext.getData().util, null, "\t");
			var contextJSON = contextStringify;
			oModelContext.setData(contextJSON);
			this.getView().setModel(oModelContext, "util");
			// this.getView().byId("displayJSON").bindElement("oModel2>/0/");
		}
	});
});