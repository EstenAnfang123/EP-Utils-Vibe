// eslint-disable-next-line no-undef
sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"../model/formatter",
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageToast",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
	],
	function (Controller, formatter, JSONModel, MessageToast, Filter, FilterOperator) {
		"use strict";

		return Controller.extend("sap.ui.demo.basicTemplate.controller.App", {
			formatter: formatter,

			onInit: function () {
				this.loadData();
			},

			loadData: async function () {
				sap.ui.core.BusyIndicator.show();
				$.ajax({
					url: "/api/v1/rates/getRatesOfProjects",
					method: "POST",
					success: (results) => {
						const data = [];
						results.forEach((result) => {
							const internalRates = result.easy_money_rates.easy_money_rate_type.find(
								(type) => type._attributes.name === "Interní sazba"
							);
							// internalRates.easy_money_rate.forEach((rate) =>
							// 	data.push({
							// 		projectId: result.projectId,
							// 		projectName: result.projectName,
							// 		rate,
							// 		buttonType: "Accept",
							// 	})
							// );
							data.push({
								projectId: result.projectId,
								projectName: result.projectName,
								rates: internalRates?.easy_money_rate,
								buttonType: "Accept",
							});
						});

						this.getView().setModel(new JSONModel(data));
						sap.ui.core.BusyIndicator.hide();
					},
				});
			},

			onDataRefresh: function () {
				this.loadData();
			},

			onSearch: function (oEvent) {
				const sQuery = oEvent.getParameter("query");
				let oTableSearchState = [];

				if (sQuery && sQuery.length > 0) {
					oTableSearchState = [
						new Filter("projectName", FilterOperator.Contains, sQuery),
					];
				}

				this.getView().byId("ratesTable").getBinding("items").filter(oTableSearchState);
			},

			onEnter: function (oEvent) {
				const index = oEvent.getSource().getBindingContext().getPath().split("/")[1];
				const contextData = oEvent
					.getSource()
					.getBindingContext()
					.getModel()
					.getData("/93")[index];
				const data = {
					projectId: contextData.projectId,
					rate: oEvent.getSource().getBindingContext().getObject(),
				};
				$.ajax({
					url: "/api/v1/rates/setProjectRate",
					method: "PUT",
					dataType: "xml",
					data: data,
					success: () => {
						MessageToast.show("Sazba aktualizována");
					},
					error: () => {
						MessageToast.show("Sazba nebyla aktualizována");
					},
				});
				oEvent.getSource().getParent().getAggregation("cells")[4].setType("Accept");
			},

			onInputChanged: function (oEvent) {
				oEvent.getSource().getParent().getAggregation("cells")[4].setType("Attention");
			},

			onCollapseAll: function () {
				var oTreeTable = this.byId("ratesTable");
				oTreeTable.collapseAll();
			},

			onNavBack: function () {
				// eslint-disable-next-line no-undef
				const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("main");
			},
		});
	}
);
