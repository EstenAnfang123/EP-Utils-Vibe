// eslint-disable-next-line no-undef
sap.ui.define(
	[
		"sap/m/library",
		"sap/ui/core/mvc/Controller",
		"../model/formatter",
		"sap/m/MessageToast",
		"sap/m/MessageBox",
		"sap/ui/model/json/JSONModel",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/ui/core/Fragment",
		"sap/ui/export/Spreadsheet",
		"sap/ui/util/Storage",
	],
	function (
		mobileLibrary,
		Controller,
		formatter,
		MessageToast,
		MessageBox,
		JSONModel,
		Filter,
		FilterOperator,
		Fragment,
		Spreadsheet,
		Storage
	) {
		"use strict";

		const URLHelper = mobileLibrary.URLHelper;

		return Controller.extend("sap.ui.demo.basicTemplate.controller.ProjectsOverview", {
			formatter: formatter,

			onInit: async function () {
				this._mDialogs = {};

				const layoutModel = new JSONModel({
					layout: "TwoColumnsBeginExpanded",
				});
				const consoleModel = new JSONModel({
					console: "TwoColumnsBeginExpanded",
				});
				const projects = new JSONModel({
					data: [],
					projectsCount: 0,
					sumExpectedRevenue: 0,
					busy: false,
				});
				const detailPage = new JSONModel({
					busy: false,
				});
				this.getView().setModel(layoutModel, "layout");
				this.getView().setModel(consoleModel, "console");
				this.getView().setModel(projects, "projects");
				this.getView().setModel(detailPage, "detailPage");

				this._mDialogs["FilterDialog"] = await Fragment.load({
					id: this.getView().getId(),
					name: "sap.ui.demo.basicTemplate.view.ProjectsOverviewFragments.FilterDialog",
					controller: this,
				}).then((oDialog) => {
					this.getView().addDependent(oDialog);
					return oDialog;
				});

				this._oStorage = new Storage(Storage.Type.local, "eputils_projects_overview");

				await this._fetchProjectCategories();
				await this._fetchProjectsOwners();
				await this._fetchProjectsManagers();
				await this._fetchProjectData();
			},

			_fetchProjectData: async function () {
				sap.ui.core.BusyIndicator.show(0);

				const oView = this.getView();

				let params = [encodeURIComponent("is_closed") + "=" + encodeURIComponent(0)];
				const projectsRes = await fetch(`/api/v1/allprojects?${params.join("&")}`);
				const projects = await projectsRes.json();

				const expectedRevenuesRes = await fetch(`/api/v1/getExpectedRevenues`);
				const realRevenuesRes = await fetch(`/api/v1/getRealRevenues`);

				const expectedRevenues = await expectedRevenuesRes.json();
				const realRevenues = await realRevenuesRes.json();

				const data = projects.projects.map((project) => {
					const projectCategoryIndex = project.custom_fields.custom_field.findIndex(
						(cf) => cf._attributes.id === 205
					);
					const projectCategory =
						project?.custom_fields?.custom_field[projectCategoryIndex]?.value?.value;
					if (Array.isArray(projectCategory)) {
						project.custom_fields.custom_field[projectCategoryIndex].value.value =
							project.custom_fields.custom_field[
								projectCategoryIndex
							].value.value.join(",");
					}

					const expectedRevenue = expectedRevenues
						.filter((revenue) => revenue.project._attributes.id === project.id)
						.reduce((prev, curr) => prev + (curr?.price2 || 0), 0);
					const realRevenue = realRevenues
						.filter((revenue) => revenue.project._attributes.id === project.id)
						.reduce((prev, curr) => prev + curr.price2, 0);

					return {
						...project,
						expectedRevenue,
						realRevenue: realRevenue ?? 0,
					};
				});

				oView.getModel("projects").setProperty("/data", data);
				oView.getModel("projects").setProperty("/projectsCount", data.length);

				this._initFilter();

				sap.ui.core.BusyIndicator.hide();
			},

			_fetchProjectCategories: async function () {
				sap.ui.core.BusyIndicator.show(0);

				const oView = this.getView();
				const projectsCategoriesRes = await fetch("/api/v1/customFieldById/205");
				if (projectsCategoriesRes.status === 200) {
					const projectsCategories = await projectsCategoriesRes.json();
					oView.setModel(
						new JSONModel(
							projectsCategories.custom_field.possible_values[1].possible_value
						),
						"projectsCategories"
					);
				} else {
					/*const projectCategoryFilter = this.getView().byId("projectCategoryFilter");
					projectCategoryFilter.setEnabled(false);
					projectCategoryFilter.setVisible(false);*/
				}

				sap.ui.core.BusyIndicator.hide();
			},

			_fetchProjectsOwners: async function () {
				sap.ui.core.BusyIndicator.show(0);

				const oView = this.getView();
				const projectsOwnersRes = await fetch("/api/v1/customFieldById/23");
				if (projectsOwnersRes.status === 200) {
					const projectsOwners = await projectsOwnersRes.json();
					oView.setModel(
						new JSONModel(projectsOwners.custom_field.possible_values.possible_value),
						"projectsOwners"
					);
				} else {
					/*const projectCategoryFilter = this.getView().byId("projectCategoryFilter");
					projectCategoryFilter.setEnabled(false);
					projectCategoryFilter.setVisible(false);*/
				}

				sap.ui.core.BusyIndicator.hide();
			},

			_fetchProjectsManagers: async function () {
				sap.ui.core.BusyIndicator.show(0);

				const oView = this.getView();
				const projectsManagersRes = await fetch("/api/v1/customFieldById/113");
				if (projectsManagersRes.status === 200) {
					const projectsManagers = await projectsManagersRes.json();
					oView.setModel(
						new JSONModel(projectsManagers.custom_field.possible_values.possible_value),
						"projectsManagers"
					);
				} else {
					/*const projectCategoryFilter = this.getView().byId("projectCategoryFilter");
					projectCategoryFilter.setEnabled(false);
					projectCategoryFilter.setVisible(false);*/
				}

				sap.ui.core.BusyIndicator.hide();
			},

			_fetchUserRates: async function (projectsIds) {
				const usersRatesRes = await fetch("/api/v1/getRatesByProjectId", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ projectsIds }),
				});

				const usersRates = await usersRatesRes.json();

				if (usersRatesRes.status !== 200) {
					MessageBox.error(usersRates.message, {
						onClose: (oAction) => {
							sap.ui.core.BusyIndicator.hide();
							this.onNavBack();
						},
					});
				}

				return usersRates;
			},

			_fetchTimeSpent: async function (ids) {
				/*const timeSpentRes = await fetch("/api/v1/timeSpent", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					// DEBUG IDS
					body: JSON.stringify({
						params: {
							"[xproject_id]": `${ids.join("|")}`,
							//"[xproject_id]": "731|368|551|698",
						},
					}),
				});
				const timeSpent = await timeSpentRes.json();
				return timeSpent;*/

				const data = await Promise.all(
					ids.map((id) => {
						return fetch("/api/v1/getProjectTimeSpent", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								params: {
									"[xproject_id]": `${id}`,
								},
							}),
						}).then((resp) => resp.json());
					})
				);

				return data.flat();
			},

			_fetchProjectIssues: async function (project) {
				const issuesRes = await fetch(`/api/v1/getProjectIssues/${project.id}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ include: "spent_time" }),
				});
				const issues = await issuesRes.json();

				/*const estimatedHoursTotal = issues.reduce(
					(prev, curr) => prev + Number(curr.estimated_hours),
					0
				);*/
				/*const spentHoursTotal = issues.reduce(
					(prev, curr) => prev + Number(curr.total_spent_hours),
					0
				);

				return {
					estimatedHoursTotal: project.sum_estimated_hours,
					spentHoursTotal,
					leftHoursTotal: project.sum_estimated_hours - spentHoursTotal,
					...issues,
				};*/
				return issues;
			},

			_fetchCRMCases: async function (project) {
				const crmCasesRes = await fetch(`/api/v1/getCRMCases/${project.id}`, {
					method: "POST",
				});

				if (crmCasesRes.status !== 200) return { price: 0 };

				const crmCases = await crmCasesRes.json();

				/*const estimatedHoursTotal = issues.reduce(
					(prev, curr) => prev + Number(curr.estimated_hours),
					0
				);*/
				const price = crmCases.reduce((prev, curr) => prev + Number(curr.price), 0);

				return {
					price: price || 0,
				};
			},

			_calculateProjectsBudgets: async function (projects) {
				const ids = projects.map((project) => project.id);
				const timeSpent = await this._fetchTimeSpent(ids);
				const userRates = (await this._fetchUserRates(ids)) || [];

				const data = userRates.map((item) => {
					let internalRate, externalRate, expectedExpense;

					const externalRateIndex = item.easy_money_rates.easy_money_rate_type.findIndex(
						(rateType) => rateType._attributes.id === 2
					);
					const internalRateIndex = item.easy_money_rates.easy_money_rate_type.findIndex(
						(rateType) => rateType._attributes.id === 1
					);

					if (
						Array.isArray(
							item.easy_money_rates.easy_money_rate_type[externalRateIndex]
								.easy_money_rate
						)
					) {
						externalRate = item.easy_money_rates.easy_money_rate_type[
							externalRateIndex
						].easy_money_rate.map((rate) => {
							return {
								rate,
								hours: timeSpent
									.filter(
										(record) =>
											record?.project?._attributes?.id === item.projectId &&
											record?.user?._attributes?.id === rate._attributes.id
									)
									.reduce((prev, curr) => {
										return prev + curr.hours;
									}, 0),
							};
						});
					} else {
						externalRate = [
							{
								rate: item.easy_money_rates.easy_money_rate_type[externalRateIndex]
									.easy_money_rate,
								hours: timeSpent
									.filter(
										(record) =>
											record?.project?._attributes?.id === item.projectId &&
											record?.user?._attributes?.id ===
												item.easy_money_rates.easy_money_rate_type[
													externalRateIndex
												].easy_money_rate._attributes.id
									)
									.reduce((prev, curr) => {
										return prev + curr.hours;
									}, 0),
							},
						];
					}

					if (
						Array.isArray(
							item.easy_money_rates.easy_money_rate_type[internalRateIndex]
								.easy_money_rate
						)
					) {
						internalRate = item.easy_money_rates.easy_money_rate_type[
							internalRateIndex
						].easy_money_rate.map((rate) => {
							return {
								rate,
								hours: timeSpent
									.filter(
										(record) =>
											record?.project?._attributes?.id === item.projectId &&
											record?.user?._attributes?.id === rate._attributes.id
									)
									.reduce((prev, curr) => {
										return prev + curr.hours;
									}, 0),
							};
						});
					} else {
						internalRate = [
							{
								rate: item.easy_money_rates.easy_money_rate_type[internalRateIndex]
									.easy_money_rate,
								hours: timeSpent
									.filter(
										(record) =>
											record?.project?._attributes?.id === item.projectId &&
											record?.user?._attributes?.id ===
												item.easy_money_rates.easy_money_rate_type[
													internalRateIndex
												].easy_money_rate._attributes.id
									)
									.reduce((prev, curr) => {
										return prev + curr.hours;
									}, 0),
							},
						];
					}

					if (
						Array.isArray(
							item.easy_money_rates.easy_money_rate_type[internalRateIndex]
								.easy_money_rate
						)
					) {
						expectedExpense = item.easy_money_rates.easy_money_rate_type[
							internalRateIndex
						].easy_money_rate.map((rate) => {
							return {
								rate,
								hours: timeSpent
									.filter(
										(record) =>
											record?.project?._attributes?.id === item.projectId &&
											record?.user?._attributes?.id === rate._attributes.id
									)
									.reduce((prev, curr) => {
										return prev + curr.hours;
									}, 0),
							};
						});
					} else {
						expectedExpense = [
							{
								rate: item.easy_money_rates.easy_money_rate_type[internalRateIndex]
									.easy_money_rate,
								hours: timeSpent
									.filter(
										(record) =>
											record?.project?._attributes?.id === item.projectId &&
											record?.user?._attributes?.id ===
												item.easy_money_rates.easy_money_rate_type[
													internalRateIndex
												].easy_money_rate._attributes.id
									)
									.reduce((prev, curr) => {
										return prev + curr.hours;
									}, 0),
							},
						];
					}

					return {
						projectId: item.projectId,
						externalRate,
						internalRate,
						expectedExpense,
					};
				});

				return data.map((item) => {
					return {
						projectId: item.projectId,
						revenue: item.externalRate.reduce((prev, curr) => {
							return prev + curr.hours * curr.rate.unit_rate;
						}, 0),
						expense: item.internalRate.reduce((prev, curr) => {
							return prev + curr.hours * curr.rate.unit_rate;
						}, 0),
					};
				});
			},

			_calculateExpectedRevenue: async function (project) {
				const issues = await this._fetchProjectIssues(project);
				const rates = await this._fetchUserRates([project.id]);

				if (issues < 1 || !Array.isArray(rates) || rates.length < 1) return;

				const expectedRevenue = issues
					.map((issue) => {
						const assignedUserId = issue?.assigned_to?._attributes.id;
						const internalRates = rates[0]?.easy_money_rates?.easy_money_rate_type.find(
							(rateType) => rateType?._attributes?.id === 1
						);
						const userRate = internalRates?.easy_money_rate.find(
							(rate) => rate?._attributes?.id === assignedUserId
						);
						return issue?.estimated_hours * userRate?.unit_rate;
					})
					.reduce((prev, curr) => prev + curr, 0);

				return expectedRevenue;
			},

			_setProjectsInfo: function () {
				const oView = this.getView();

				oView
					.getModel("projects")
					.setProperty(
						"/projectsCount",
						oView.byId("projectsTable").getBinding("items").getLength()
					);

				/*const oCurrency = new sap.ui.model.type.Currency({
					showMeasure: true,
					preserveDecimals: false,
				});
				const amount = data?.reduce((prev, curr) => prev + curr.expectedRevenue, 0);
				const currency = data[0]?.expectedRevenueCurrency || "CZK";

				oView.getModel("projects").setProperty("/sumExpectedRevenue", amount);

				return oCurrency.formatValue([amount, currency], "string");*/
			},

			_calculateBudget: async function (project) {
				const budget = await this._calculateProjectsBudgets([project]);

				return {
					projectRevenue: budget[0]?.revenue ?? 0,
					projectExpense: budget[0]?.expense ?? 0,
					willCome: project.expectedRevenue?.price2 - project.realRevenue ?? 0,
					realProfit: project.realRevenue - budget[0]?.expense ?? 0,
				};
			},

			handleRefreshData: async function () {
				const projectCategoryFilter = this.getView().byId("projectCategoryFilter");
				projectCategoryFilter.removeAllSelectedItems();
				await this._fetchProjectCategories();
				await this._fetchProjectData();
			},

			onSelectProject: async function (oEvent) {
				const oDetailModel = this.getView().getModel("detailPage");
				oDetailModel.setProperty("/busy", true);
				const oSelectedItem = oEvent
					.getSource()
					.getSelectedItem()
					.getBindingContext("projects")
					.getObject();

				const oView = this.getView();
				// 	const issues = await this._fetchProjectIssues(oSelectedItem);
				// oView.setModel(new JSONModel(issues), "issues");
				const expectedRevenue = await this._calculateExpectedRevenue(oSelectedItem);
				const crmCases = await this._fetchCRMCases(oSelectedItem);
				const budget = await this._calculateBudget(oSelectedItem);
				oView.setModel(new JSONModel({ expectedRevenue }), "expectedRevenue");
				oView.setModel(new JSONModel(crmCases), "crmCases");
				oView.setModel(new JSONModel(budget), "budget");
				oView.setModel(new JSONModel(oSelectedItem), "selectedProject");
				oDetailModel.setProperty("/busy", false);
			},

			onSearchPress: function (oEvent) {
				const sSearchText = oEvent.getParameter("query");
				const projectsTable = this.getView().byId("projectsTable");
				let aFilter = [];

				if (sSearchText) {
					aFilter = new Filter(
						[
							new Filter("name", FilterOperator.Contains, sSearchText),
							new Filter(
								"custom_fields/custom_field/0/name",
								FilterOperator.Contains,
								sSearchText
							),
						],
						false
					);
				}

				projectsTable.getBinding("items").filter(aFilter);
				this._setProjectsInfo();
			},

			_initFilter: function () {
				const oViewSettingsDialog = this.getView().byId("viewSettingsDialog");
				const initFilters = this._oStorage.get("init_filters");

				if (initFilters) {
					const initFiltersJSON = JSON.parse(initFilters);

					oViewSettingsDialog.setSelectedFilterCompoundKeys(initFiltersJSON);
					oViewSettingsDialog.fireConfirm({ filterCompoundKeys: initFiltersJSON });
				}
			},

			handleFilterButtonPressed: function () {
				this._openDialog("FilterDialog");
			},

			_openDialog: function (sName) {
				if (!this._mDialogs[sName]) {
					this._mDialogs[sName] = Fragment.load({
						id: this.getView().getId(),
						name: "sap.ui.demo.basicTemplate.view.ProjectsOverviewFragments." + sName,
						controller: this,
					}).then((oDialog) => {
						this.getView().addDependent(oDialog);
						return oDialog;
					});
				}
				this._mDialogs[sName].open();
			},

			handleConfirmFilter: function (oEvent) {
				const oTable = this.getView().byId("projectsTable");
				const filterCompoundKeys = oEvent.getParameters().filterCompoundKeys;
				const sFilterString = oEvent.getParameter("filterString");
				const aFilters = [];

				if (filterCompoundKeys && Object.keys(filterCompoundKeys).length) {
					for (let item of Object.keys(filterCompoundKeys)) {
						const groupFilter = [];
						let filterName = "";
						switch (item) {
							case "projectsCategories":
								filterName = "custom_fields/custom_field/8/value/value";
								break;
							case "projectsOwners":
								filterName = "custom_fields/custom_field/1/value";
								break;
							case "projectsManagers":
								filterName = "custom_fields/custom_field/2/value";
								break;
							case "TMFIX":
								filterName = "custom_fields/custom_field/3/value";
								break;
						}
						for (let value of Object.keys(filterCompoundKeys[item])) {
							groupFilter.push(
								new Filter(
									filterName,
									FilterOperator.EQ,
									value.replace("&", "&amp;")
								)
							);
						}
						aFilters.push(new Filter(groupFilter, false));
					}

					if (sFilterString) MessageToast.show(sFilterString);
				}

				oTable.getBinding("items").filter(new Filter(aFilters, true));
				this._oStorage.put("init_filters", JSON.stringify(filterCompoundKeys));
				this._setProjectsInfo();
			},

			handleExportButtonPressed: function (oEvent) {
				const projectsTable = this.getView().byId("projectsTable");
				const projectsTableBinding = projectsTable.getBinding("items");
				const tableItems = projectsTableBinding.aIndices.map(
					(item) => projectsTableBinding.oList[item]
				);

				const oSheet = new Spreadsheet({
					workbook: {
						columns: [
							{
								label: "ID",
								property: "id",
							},
							{
								label: "Projekt",
								property: "name",
							},
							{
								label: "Plánovaný obrat",
								property: "expectedRevenue",
								type: "number",
								unitProperty: "currency",
							},
							{
								label: "Skutečný obrat",
								property: "realRevenue",
								type: "number",
								unitProperty: "currency",
							},
							{
								label: "Výnosově",
								property: "projectRevenue",
								type: "number",
								unitProperty: "currency",
							},
						],
						context: {
							application: "EP-Utils",
							sheetName: "data",
						},
					},
					dataSource: tableItems /*binding.getModel().getProperty(binding.getPath())*/,
					fileName: "data.xlsx",
				});

				oSheet.build().finally(function () {
					oSheet.destroy();
				});
			},

			onLinkPress: function (oEvent) {
				URLHelper.redirect(
					`https://effiis.easyproject.cz/projects/${oEvent
						.getSource()
						.getText()}/easy_money`,
					true
				);
			},

			onNavBack: function () {
				const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("main");
			},
		});
	}
);
