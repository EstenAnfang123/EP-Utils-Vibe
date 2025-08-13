// eslint-disable-next-line no-undef
sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"../model/formatter",
		"sap/m/MessageToast",
		"sap/ui/model/json/JSONModel",
	],
	function (Controller, formatter, MessageToast, JSONModel) {
		"use strict";

		return Controller.extend("sap.ui.demo.basicTemplate.controller.App", {
			formatter: formatter,

			onInit: function () {
				const oView = this.getView();
				this.tileEso = oView.byId("tileEso");
				this.tileEso.setState("Disabled");
				this.tileEPUtil2 = oView.byId("tileEPUtil2");
				this.tileEPUtil2.setState("Disabled");
				this.tileEPUtil3 = oView.byId("tileEPUtil3");
				this.tileEPUtil3.setState("Disabled");
				this.tileEPUtil4 = oView.byId("tileEPUtil4");
				this.tileEPUtil4.setState("Disabled");
				this.tileRates = oView.byId("tileRates");
				this.tileRates.setState("Disabled");
				this.tileBonuses = oView.byId("tileBonuses");
				this.tileBonuses.setState("Disabled");
				this.projectsOverview = oView.byId("projectsOverview");
				this.projectsOverview.setState("Disabled");
				this.utilization = oView.byId("utilization");
				this.utilization.setState("Disabled");
				this.utilizationByProject = oView.byId("utilizationByProject");
				this.utilizationByProject.setState("Disabled");
				this.utilizationByOffer = oView.byId("utilizationByOffer");
				this.utilizationByOffer.setState("Disabled");

				const queryString = window.location.search;
				if (queryString) {
					const urlParams = new URLSearchParams(queryString);
					if (urlParams.has("code")) {
						const code = urlParams.get("code");
						$.ajax({
							url: "/api/v1/esoutil4/exceldata",
							method: "POST",
							data: { code: code },
						});
					}
				}
			},

			onPress: function (oEvt) {
				// eslint-disable-next-line no-undef
				const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				switch (oEvt.getSource()) {
					case this.tileEso:
						oRouter.navTo("eso");
						break;
					case this.tileEPUtil2:
						oRouter.navTo("eputil2");
						break;
					case this.tileEPUtil3:
						oRouter.navTo("eputil3");
						break;
					case this.tileEPUtil4:
						oRouter.navTo("eputil4");
						break;
					case this.tileRates:
						oRouter.navTo("rates");
						break;
					case this.tileBonuses:
						oRouter.navTo("bonuses");
						break;
					case this.projectsOverview:
						oRouter.navTo("projectsOverview");
						break;
					case this.utilization:
						oRouter.navTo("utilization");
						break;
					case this.utilizationByProject:
						oRouter.navTo("utilizationByProject");
						break;
					case this.utilizationByOffer:
						oRouter.navTo("utilizationByOffer");
				}
			},

			onLogin: function () {
				const oView = this.getView();
				const oModel = new JSONModel();
				// const loginButton = oView.byId("loginButton");
				// const loginInput = oView.byId("loginInput");
				// const pwdinput = oView.byId("pwdInput");
				const loginInputValue = oView.byId("loginInput").getValue();
				const pwdInputValue = oView.byId("pwdInput").getValue();

				if (loginInputValue != "" && pwdInputValue != "") {
					oModel.loadData("/api/v1/login", {}, true, "POST", false, true, {
						login: loginInputValue,
						pwd: pwdInputValue,
					});
					// loginInput.setVisible(false);
					// pwdinput.setVisible(false);
					// loginButton.setVisible(false);
				}
				oModel.attachRequestCompleted((data) => {
					MessageToast.show(data.mParameters.success);
					if (data.mParameters.success) {
						MessageToast.show("Přihlášen.");
						this.tileEso.setState("Loaded");
						this.tileEPUtil2.setState("Loaded");
						this.tileEPUtil3.setState("Loaded");
						this.tileEPUtil4.setState("Loaded");
						this.tileRates.setState("Loaded");
						this.tileBonuses.setState("Loaded");
						this.projectsOverview.setState("Loaded");
						this.utilization.setState("Loaded");
						this.utilizationByProject.setState("Loaded");
						this.utilizationByOffer.setState("Loaded");
					} else {
						this.tileEso.setState("Disabled");
						this.tileEPUtil2.setState("Disabled");
						this.tileEPUtil3.setState("Disabled");
						this.tileEPUtil4.setState("Disabled");
						this.tileRates.setState("Disabled");
						this.tileBonuses.setState("Disabled");
						this.projectsOverview.setState("Disabled");
						this.utilization.setState("Disabled");
						this.utilizationByProject.setState("Disabled");
						this.utilizationByOffer.setState("Disabled");
						if (
							data.mParameters.errorobject.statusCode === 401 ||
							data.mParameters.errorobject.statusCode === 403
						) {
							MessageToast.show("Nemáte přístup.");
						} else {
							MessageToast.show("Nesprávné jméno nebo heslo.");
						}
					}
				});
			},
		});
	}
);
