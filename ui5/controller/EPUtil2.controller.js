// eslint-disable-next-line no-undef
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"../model/formatter",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel",
	"sap/m/Button",
	"sap/m/Dialog",
	"sap/m/Text",
	"sap/m/library"
], function (Controller, formatter, MessageToast, JSONModel, Button, Dialog, Text, library) {
	"use strict";

	return Controller.extend("sap.ui.demo.basicTemplate.controller.App", {

		formatter: formatter,

		onInit: function () {
			// eslint-disable-next-line no-undef
			sap.ui.core.BusyIndicator.show(0);

			this.itemsToChange = [];

			const oView = this.getView();
			const oModelProjects = new JSONModel();

			oModelProjects.loadData("/api/v1/allprojects");
			oModelProjects.attachRequestCompleted(oEvent => {
				if (oEvent.mParameters.success) {
					oView.setModel(oEvent.getSource(), "projects");
					// eslint-disable-next-line no-undef
					sap.ui.core.BusyIndicator.hide();
					this._loadTableData();
				}
				else {
					// eslint-disable-next-line no-undef
					sap.ui.core.BusyIndicator.hide();
					this.onNavBack();
					MessageToast.show("error");
				}
			});

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

		onSelectionChanged: function (oEvent) {
			const supplier = oEvent.getSource().getParent().mAggregations.cells[0].getProperty("text");
			const projectId = oEvent.getSource().getParent().mAggregations.cells[1].getProperty("text").split("\n\n")[1];
			const selectedIndex = oEvent.getSource().getParent().mAggregations.cells[2].getProperty("selectedIndex");
			const aFilteredRecords = this.getView().getModel("dataFull").getData().filter(record => record.projectId == projectId && record.supplier == supplier);
			aFilteredRecords.selectedIndex = selectedIndex;

			let index = this.itemsToChange.findIndex(x => x[0].id == aFilteredRecords[0].id && x[0].projectId == aFilteredRecords[0].projectId);

			if (index === -1) {
				this.itemsToChange.push({ ...aFilteredRecords });
			}
			else {
				if (selectedIndex == 0) {
					this.itemsToChange.splice(index, 1);
				}
				else {
					this.itemsToChange.splice(index, 1, { ...aFilteredRecords });
				}
			}

		},

		onPress: function () {
			// eslint-disable-next-line no-undef
			sap.ui.core.BusyIndicator.show(0);

			// eslint-disable-next-line no-undef
			$.ajax({
				url: "/api/v1/esoutil2/updateproject",
				method: "POST",
				headers: {
					"Content-Type": "application/json"
				},
				dataType: "json",
				data: JSON.stringify(this.itemsToChange),
				success: function (result) {
					// eslint-disable-next-line no-undef
					sap.ui.core.BusyIndicator.hide();
					if (result.length) {
						const errors = result.map(item => {
							return "Projekt: " + item.projectId + ", Záznam: " + item.name + "\n";
						});
						const oDialog = new Dialog({
							title: "Chyba",
							type: "Message",
							state: "Error",
							content: new Text({
								text: errors
							}),
							beginButton: new Button({
								type: library.ButtonType.Emphasized,
								text: "Zavřít",
								press: function () {
									oDialog.close();
								}
							}),
							afterClose: function () {
								oDialog.destroy();
							}
						});
						oDialog.open();
					}
				}
			});
		},

		_loadTableData: function () {
			const oModelData = new JSONModel();
			const oView = this.getView();
			const aData = [];
			const allProjectsIds = this.getView().getModel("projects").getData().projects.map(project => project.id);

			const oTable = oView.byId("projectTable");
			oTable.destroyItems();

			oView.setModel(null, "data");

			if (!allProjectsIds.length) {
				// eslint-disable-next-line no-undef
				sap.ui.core.BusyIndicator.hide();
				return;
			}
			// eslint-disable-next-line no-undef
			sap.ui.core.BusyIndicator.show(0);
			oModelData.loadData("/api/v1/esoutil2/getrealexpensesbyid/" + allProjectsIds.toString());
			oModelData.attachRequestCompleted(evt => {
				if (!evt.mParameters.success) {
					// eslint-disable-next-line no-undef
					sap.ui.core.BusyIndicator.hide();
					return false;
				}

				aData.push({ ...evt.getSource().oData });

				const aFilteredData = aData[0].expenses.filter((record, index, self) => self.findIndex(t => t.supplier === record.supplier && t.projectId === record.projectId) === index);

				oView.setModel(new JSONModel(aFilteredData), "data");
				oView.setModel(new JSONModel(aData[0].expenses), "dataFull");
				// eslint-disable-next-line no-undef
				sap.ui.core.BusyIndicator.hide();
			});
		}
	});
});