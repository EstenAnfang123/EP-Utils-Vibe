sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"sap/ui/model/json/JSONModel",
		"sap/ui/export/Spreadsheet",
		"sap/ui/core/ValueState",
		"sap/m/Dialog",
		"sap/m/DialogType",
		"sap/m/Button",
		"sap/m/ButtonType",
		"sap/m/Text",
	],
	function (
		Controller,
		JSONModel,
		Spreadsheet,
		ValueState,
		Dialog,
		DialogType,
		Button,
		ButtonType,
		Text
	) {
		"use strict";

		return Controller.extend("sap.ui.demo.basicTemplate.controller.Bonuses", {
			onInit: function () {
				this._loadData(false);
			},

			_loadData: async function (showExported = false) {
				sap.ui.core.BusyIndicator.show(0);
				const oView = this.getView();
				const usersResponse = await fetch("/api/v1/bonuses/getAllUsers", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						params: {
							"[cf_154]": "Intern%C3%AD",
						},
					}),
				});
				const userData = await usersResponse.json();
				const timeSpentResponse = await fetch("/api/v1/timespent", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						params: {
							spent_on: "in_past_n_days|180" /*"current_year"*/,
							"[cf_141]": "ano",
							"[cf_208]": showExported ? "is_not_null" : "is_null",
							"[xproject_id]": "!417|706",
							//xproject_id: "440|578", //test projects
						},
					}),
				});
				const timeSpentData = await timeSpentResponse.json();
				if (userData && timeSpentData) {
					const arr = [];
					timeSpentData
						.filter((item) => {
							const index = userData.findIndex(
								(user) => user.id === item.user["_attributes"].id
							);

							return index > -1;
						})
						.map((record) => {
							const year = Intl.DateTimeFormat("cs", {
								year: "numeric",
							}).format(new Date(record.spent_on));
							const month = Intl.DateTimeFormat("cs", {
								month: "long",
							}).format(new Date(record.spent_on));
							const groupDate = `${year} ${month}`;

							const index = arr.findIndex(
								(item) =>
									item.projectId === record.project["_attributes"].id &&
									item.userId === record.user["_attributes"].id &&
									item.groupDate === groupDate
							);

							if (index === -1) {
								arr.push({
									projectId: record.project["_attributes"].id,
									projectName: record.project["_attributes"].name,
									userId: record.user["_attributes"].id,
									userName: record.user["_attributes"].name,
									groupDate: groupDate,
									hours: record.hours,
									entries: [record.id],
									export: false,
								});
							} else {
								arr[index].hours += record.hours;
								arr[index].entries.push(record.id);
							}
						});
					oView.setModel(new JSONModel(arr));
				}
				sap.ui.core.BusyIndicator.hide();
			},

			onTableRefresh: function () {
				const sKey = this.getView().byId("idIconTabBar").getSelectedKey();

				if (sKey === "NotExported") {
					this._loadData(false);
				} else if (sKey === "Exported") {
					this._loadData(true);
				}
			},

			onFilterSelect: function (oEvent) {
				const sKey = oEvent.getParameter("key");

				if (sKey === "NotExported") {
					this._loadData(false);
				} else if (sKey === "Exported") {
					this._loadData(true);
				}
			},

			exportData: async function () {
				//const binding = this.byId("idBonusesTable").getBinding("items");
				const data = this.getView()
					.getModel()
					.getData()
					.filter((item) => {
						return item.export;
					});

				if (data.length > 0) {
					sap.ui.core.BusyIndicator.show(0);
					/*const dateTime = new Date(Date.now()).toISOString();
					const date = dateTime.split("T")[0];
					const time = dateTime.split("T")[1];
					const timeParts = time.split(":");*/
					const dateTime = new Date();

					const oSheet = new Spreadsheet({
						workbook: {
							columns: [
								{
									label: "Jméno",
									property: "userName",
								},
								{
									label: "Projekt",
									property: "projectName",
								},

								{
									label: "Hodiny",
									property: "hours",
									type: "number",
								},
							],
							context: {
								sheetName: "data",
							},
						},
						dataSource: data /*binding.getModel().getProperty(binding.getPath())*/,
						fileName: "data.xlsx",
					});

					oSheet.build().finally(function () {
						oSheet.destroy();
					});

					const entries = [];
					data.forEach((item) => entries.push(...item.entries));

					const exportedMonth = this.calculateLastMonth();

					const response = await fetch("/api/v1/bonuses/updateTimeEntries", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							entries,
							//dateTime: `${date}T${timeParts[0]}:${timeParts[1]}`,
							dateTime: `${dateTime.getFullYear()}-${
								dateTime.getMonth() + 1
							}-${dateTime.getDate()} ${dateTime.getHours()}:${dateTime.getMinutes()}`,
							exportedMonth: `${exportedMonth.num} ${exportedMonth.month}`,
						}),
					});

					const responseBody = await response.json();

					if (responseBody.status === "error") {
						console.log("ERRORS", responseBody.errors);
						this.openDialog("Chyba", "Chyby jsou vypsány v konzoli");
					}

					this.openDialog("Úspěch", responseBody.message);
					sap.ui.core.BusyIndicator.hide();
				} else {
					this.openDialog("Nezvolená data", "Žádná data nebyla zvolena na export");
				}
			},

			openDialog: function (title, message) {
				if (!this.oDialog) {
					this.oDialog = new Dialog({
						type: DialogType.Message,
						title: title,
						state: ValueState.Warning,
						content: new Text({
							text: message,
						}),
						beginButton: new Button({
							type: ButtonType.Emphasized,
							text: "OK",
							press: function () {
								this.oDialog.close();
							}.bind(this),
						}),
					});
				}

				this.oDialog.open();
			},

			calculateLastMonth: function () {
				const months = [
					{ num: "01", month: "LEDEN" },
					{ num: "02", month: "ÚNOR" },
					{ num: "03", month: "BŘEZEN" },
					{ num: "04", month: "DUBEN" },
					{ num: "05", month: "KVĚTEN" },
					{ num: "06", month: "ČERVEN" },
					{ num: "07", month: "ČERVENEC" },
					{ num: "08", month: "SRPEN" },
					{ num: "09", month: "ZÁŘÍ" },
					{ num: "10", month: "ŘÍJEN" },
					{ num: "11", month: "LISTOPAD" },
					{ num: "12", month: "PROSINEC" },
				];

				const date = new Date();
				let currentMonth = date.getMonth();

				if (currentMonth < 1) currentMonth = 12;
				return months[currentMonth - 1];
			},

			onSelectAll: function (oEvent) {
				const data = this.getView().getModel().getData();
				const bSelected = oEvent.getParameter("selected");

				data.forEach((item) => (bSelected ? (item.export = true) : (item.export = false)));

				this.getView().setModel(new JSONModel(data));
			},

			onNavBack: function () {
				const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("main");
			},
		});
	}
);
