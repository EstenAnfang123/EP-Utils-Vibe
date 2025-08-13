// eslint-disable-next-line no-undef
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"../model/formatter",
	"sap/m/MessageToast",
	"sap/ui/model/json/JSONModel"
	//REVIEW
], function (Controller, formatter, MessageToast, JSONModel) {
	"use strict";

	return Controller.extend("sap.ui.demo.basicTemplate.controller.App", {

		formatter: formatter,

		onInit: function () {
			// eslint-disable-next-line no-undef
			sap.ui.core.BusyIndicator.show(0);

			const oView = this.getView();
			const oModelProjects = new JSONModel();
			oView.byId("projectsComboBox").destroyItems();

			oModelProjects.loadData("/api/v1/esoutil1/projects/");
			oModelProjects.attachRequestCompleted(oEvent => {
				if (oEvent.mParameters.success) {
					oView.setModel(oEvent.getSource(), "projects");
					// eslint-disable-next-line no-undef
					sap.ui.core.BusyIndicator.hide();
					// this._loadAllProjectsData();
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

		onChange: function (oEvent) {
			// eslint-disable-next-line no-undef
			sap.ui.core.BusyIndicator.show(0);
			const projectsIds = oEvent.getSource().getSelectedKeys();

			if (projectsIds.length) {
				this._loadTableData(projectsIds);
			}
			else {
				this._loadAllProjectsData();
			}
		},

		onPress: function () {
			// eslint-disable-next-line no-undef
			sap.ui.core.BusyIndicator.show(0);
			
			const ids = this._getProjectsIds();
			// console.log(ids);

			ids.forEach(id => {
				// eslint-disable-next-line no-undef
				sap.ui.core.BusyIndicator.show(0);
				// eslint-disable-next-line no-undef
				$.get("/api/v1/esoutil1/projectdata/update/" + id, () => {
					if (id == ids[ids.length - 1]) {
						this.getView().byId("projectsComboBox").clearSelection();
						this._loadAllProjectsData();
						// this.onInit();
					}
				});
			});
		},

		_getProjectsIds: function(){
			const oView = this.getView();
			const allProjectsIds = oView.getModel("projects").getData().projects.map(project => project.id);
			const selectedIds = oView.byId("projectsComboBox").getSelectedKeys();
			const ids = selectedIds.length ? selectedIds : allProjectsIds;
			return ids;
		},

		_loadTableData: function (projectsIds) {
			const oModelData = new JSONModel();
			const oView = this.getView();
			const aData = [];

			const oTable = oView.byId("projectTable");
			oTable.destroyItems();

			oView.setModel(null, "data");

			if (!projectsIds.length) {
				// eslint-disable-next-line no-undef
				sap.ui.core.BusyIndicator.hide();
				return;
			}
			// eslint-disable-next-line no-undef
			sap.ui.core.BusyIndicator.show(0);
			oModelData.loadData("/api/v1/esoutil1/projectdata/" + projectsIds.toString() + "?top=0" + "&page=0");
			oModelData.attachRequestCompleted(evt => {
				if (!evt.mParameters.success) {
					// eslint-disable-next-line no-undef
					sap.ui.core.BusyIndicator.hide();
					return false;
				}

				aData.push({ ...evt.getSource().oData });
				let tableData = aData.reduce((acc, curr) => acc.concat(curr.data), []).filter(item => item);
				oView.setModel(new JSONModel(tableData), "data");
				// eslint-disable-next-line no-undef
				sap.ui.core.BusyIndicator.hide();
			});

		},

		_loadAllProjectsData: function () {
			const allProjectsIds = this.getView().getModel("projects").getData().projects.map(project => project.id);
			this._loadTableData(allProjectsIds);
		}
	});
});