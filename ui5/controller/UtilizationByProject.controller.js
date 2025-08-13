// eslint-disable-next-line no-undef
sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"sap/m/MessageToast",
		"sap/ui/model/json/JSONModel",
		"sap/m/MessageBox",
		"sap/ui/model/resource/ResourceModel",
		"../model/formatter",
		"sap/ui/model/Filter",
		"sap/ui/model/Sorter",
		"sap/ui/model/FilterOperator",
		"sap/ui/core/Fragment",
	],
	function (
		Controller,
		MessageToast,
		JSONModel,
		MessageBox,
		ResourceModel,
		formatter,
		Filter,
		Sorter,
		FilterOperator,
		Fragment
	) {
		"use strict";

		return Controller.extend("sap.ui.demo.basicTemplate.controller.UtilizationByProject", {
			formatter: formatter,

			onInit: async function () {
				this._months = [
					"january",
					"february",
					"march",
					"april",
					"may",
					"june",
					"july",
					"august",
					"september",
					"october",
					"november",
					"december",
				];
				this._mViewSettingsDialogs = {};
				this._i18n = new ResourceModel({
					bundleName: "sap.ui.demo.basicTemplate.i18n.i18n",
				}).getResourceBundle();

				this.getView().setModel(
					new JSONModel({
						projects: [],
					})
				);
				this.getView().setModel(
					new JSONModel({ user: null, projectsCount: 0, managers: [] }),
					"metadata"
				);
				this.getView().setModel(
					new JSONModel({
						project: null,
						workersPlan: [],
						workersReality: [],
					}),
					"detail"
				);

				this._initMasterData();
			},

			_initMasterData: async function () {
				sap.ui.core.BusyIndicator.show();

				const oView = this.getView();
				const projectsListBinding = this.getView().byId("projectsList").getBinding("items");

				const projectsPromise = this._loadProjects();
				const userPromise = this._loadUser();
				const managersPromise = this._loadManagers();

				let [projects, user, managers] = await Promise.all([
					projectsPromise,
					userPromise,
					managersPromise,
				]);

				projects = projects.map((project) => {
					const tmFix = project.custom_fields.custom_field.find(
						(cf) => cf._attributes.id === 80
					);
					const managerId = project.custom_fields.custom_field.find(
						(cf) => cf._attributes.id === 113
					).value;

					return { ...project, managerId, tmFix: tmFix.value.replace("&amp;", "&") };
				});

				oView.getModel().setProperty("/projects", projects);

				const tmFixFilters = new Filter([
					new Filter("tmFix", FilterOperator.EQ, "T&M"),
					new Filter("tmFix", FilterOperator.EQ, "FIX"),
				]);
				const managerFilters = new Filter([
					new Filter("managerId", FilterOperator.EQ, user.user.id),
				]);
				const aFilters = [new Filter([tmFixFilters, managerFilters], true)];
				projectsListBinding.filter(aFilters);

				oView.getModel("metadata").setProperty("/user", user.user);
				oView
					.getModel("metadata")
					.setProperty("/projectsCount", projectsListBinding.getLength());
				oView.getModel("metadata").setProperty("/managers", managers);

				sap.ui.core.BusyIndicator.hide();
			},

			_loadProjects: async function () {
				try {
					const projects = await (
						await fetch("/api/v1/getallprojects", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								params: {
									is_closed: 0,
									sort: "created_on",
								},
							}),
						})
					).json();

					return projects;
				} catch (e) {
					MessageBox.error(this._i18n.getText("errorLoadingProjects"));
				}

				return [];
			},

			_loadUser: async function () {
				try {
					const user = await (
						await fetch("/api/v1/getCurrentUser", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
						})
					).json();

					return user;
				} catch (e) {
					MessageBox.error(this._i18n.getText("errorLoadingUser"));
				}

				return null;
			},

			_loadManagers: async function () {
				try {
					const managers = await (
						await fetch("/api/v1/getAllUsers", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								params: {
									status: 1,
									roles: 3,
									sort: "created_on",
								},
							}),
						})
					).json();

					return managers;
				} catch (e) {
					MessageBox.error(this._i18n.getText("errorLoadingUsers"));
				}

				return [];
			},

			_loadProjectUsersFromDB: async function (users, projectsIds, year) {
				try {
					const projects = await (
						await fetch("/api/v1/getProjectsFromDB", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								user: users,
								projects: projectsIds,
								year,
							}),
						})
					).json();

					return projects;
				} catch (e) {
					MessageBox.error(this._i18n.getText("errorLoadingProjectsPlans"));
				}

				return [];
			},

			onRefreshUsersPress: function () {
				this._initMasterData();
			},

			onPressProjectsItem: function (oEvent) {
				const project = oEvent.getParameter("listItem").getBindingContext().getObject();

				this._initDetail(project);
			},

			_initDetail: async function (project) {
				const oView = this.getView();
				oView.setBusy(true);

				const projectIssues = await this._loadProjectIssues(project.id);

				const uniqueUsersFromIssues = [
					...new Map(
						projectIssues.map((issue) => [
							issue.assigned_to?._attributes.id,
							issue.assigned_to?._attributes,
						])
					).values(),
				].filter(Boolean);

				const dbProjectUsersPromise = this._loadProjectUsersFromDB(
					uniqueUsersFromIssues.map((user) => user.id),
					project.id,
					new Date().getFullYear()
				);
				const dbProjectUsersNextYearPromise = this._loadProjectUsersFromDB(
					uniqueUsersFromIssues.map((user) => user.id),
					project.id,
					new Date().getFullYear() + 1
				);
				const projectTimeEntriesPromise = this._loadProjectTimeEntries(project.id);

				const [dbProjectUsers, dbProjectUsersNextYear, projectTimeEntries] =
					await Promise.all([
						dbProjectUsersPromise,
						dbProjectUsersNextYearPromise,
						projectTimeEntriesPromise,
					]);

				const workersPlan = this._initWorkersTablePlan(
					project.id,
					uniqueUsersFromIssues,
					dbProjectUsers
				);

				const workersPlanNextYear = this._initWorkersTablePlan(
					project.id,
					uniqueUsersFromIssues,
					dbProjectUsersNextYear
				);

				const workersReality = this._initWorkersTableReality(
					workersPlan,
					projectTimeEntries
				);


				// 1. Add sum of months per user
workersPlan.forEach((worker) => {
	worker.sortWeight = 1;
	let userTotal = 0;
	this._months.forEach((month) => {
		userTotal += Number(worker[month] || 0);
	});
	worker.totalPlanned = formatter.roundTo3Decimals(userTotal); // optional: format to 3 decimals
});


workersPlanNextYear.forEach((worker) => {
	let userTotal = 0;
	this._months.forEach((month) => {
		userTotal += Number(worker[month] || 0);
	});
	worker.totalPlanned = formatter.roundTo3Decimals(userTotal);
});

workersReality.forEach((worker) => {
	worker.sortWeight = 1;
	let userTotal = 0;
	this._months.forEach((month) => {
		userTotal += Number(worker[month] || 0);
	});
	worker.totalPlanned = formatter.roundTo3Decimals(userTotal); // optional: format to 3 decimals
});

var totalRow = { name: "Celkem", sortWeight: 999 }; //shown as last row
// 2. Calculate monthly totals across all users
var monthlySums = {};
var grandTotal = {};
this._months.forEach((month) => {

	monthlySums[month] = formatter.roundTo3Decimals(
		workersPlan.reduce((sum, worker) => sum + Number(worker[month] || 0), 0)
	);
	totalRow[month] = monthlySums[month];
    grandTotal = this._months.reduce((sum, month) => sum + (monthlySums[month] || 0), 0);
	totalRow.totalPlanned = formatter.roundTo3Decimals(grandTotal);
	workersPlan.push(totalRow); // Add to end of list
});

this._months.forEach((month) => {
	monthlySums[month] = formatter.roundTo3Decimals(
		workersPlanNextYear.reduce((sum, worker) => sum + Number(worker[month] || 0), 0)
	);
	totalRow[month] = monthlySums[month];
    grandTotal = this._months.reduce((sum, month) => sum + (monthlySums[month] || 0), 0);
	totalRow.totalPlanned = formatter.roundTo3Decimals(grandTotal);
	workersPlanNextYear.push(totalRow);
});

this._months.forEach((month) => {
	monthlySums[month] = formatter.roundTo3Decimals(
		workersReality.reduce((sum, worker) => sum + Number(worker[month] || 0), 0)
	);
	totalRow[month] = monthlySums[month];
    grandTotal = this._months.reduce((sum, month) => sum + (monthlySums[month] || 0), 0);
	totalRow.totalPlanned = formatter.roundTo3Decimals(grandTotal);
	workersReality.push(totalRow);
});



//tady suma z array workersPlan, suma z workersPlanNextYear, suma z workersReality ? 
//oView.getModel("detail").setProperty("/workersPlan", workersPlan);
oView.getModel("detail").setProperty("/monthlySums", monthlySums);



				oView.getModel("detail").setProperty("/project", project);
				oView.getModel("detail").setProperty("/workersPlan", workersPlan);
				oView.getModel("detail").setProperty("/workersPlanNextYear", workersPlanNextYear);
				oView.getModel("detail").setProperty("/workersReality", workersReality);

				oView.setBusy(false);
			},

			_loadProjectIssues: async function (projectId) {
				try {
					const projectIssues = await (
						await fetch(`/api/v1/getProjectIssues/${projectId}`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								params: { status_id: "!4", sort: "created_on" },
							}),
						})
					).json();

					return projectIssues;
				} catch (e) {
					MessageBox.error(this._i18n.getText("errorLoadingIssues"));
				}

				return [];
			},

			_loadProjectTimeEntries: async function (projectId) {
				try {
					const projectTimeEntries = await (
						await fetch(`/api/v1/getProjectTimeEntries`, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								projectId,
								sort: "created_on"
							}),
						})
					).json();

					return projectTimeEntries;
				} catch (e) {
					MessageBox.error(this._i18n.getText("errorLoadingIssues"));
				}

				return [];
			},

			_initWorkersTablePlan: function (projectId, users, dbProjectUsers) {
				let data = [];

				data = users.map((user) => {
					const dbProject = dbProjectUsers.find(
						(item) => item.project_id === projectId && item.user_id === user.id
					) || {
						project_id: projectId,
						user_id: user.id,
						name: user.name,						
					};

					const userData = {
						name: user.name,
						...dbProject,
					};

					return this._fillMissingMonths(userData);
				});

				return data;
			},

			_initWorkersTableReality: function (workersPlan, projectTimeEntries) {
				const realityData = workersPlan.map((worker) => {
					const workerReality = {
						project_id: worker.project_id,
						user_id: worker.user_id,
						name: worker.name,
					};

					this._months.forEach((month, index) => {
						const timeEntries = projectTimeEntries.filter((timeEntry) => {
							const spentOnDate = new Date(timeEntry.spent_on);
							const spentOnYear = spentOnDate.getFullYear();
							const spentOnMonth = spentOnDate.getMonth();
							const currentYear = new Date().getFullYear();

							return (
								timeEntry.user._attributes.id === worker.user_id &&
								spentOnYear === currentYear &&
								spentOnMonth === index
							);
						});
						workerReality[month] = `${formatter.roundTo3Decimals(
							timeEntries.reduce((prev, curr) => prev + curr.hours / 8, 0)
						)}/${worker[month]}`;
					});

					return workerReality;
				}, []);

				return realityData;
			},

			onProjectUsersSubmit: function () {
				const detailModel = this.getView().getModel("detail");
				const project = detailModel.getProperty("/project");
				const workersPlan = detailModel.getProperty("/workersPlan");
				const year = new Date().getFullYear();

				this._saveProjectUsers(project.id, workersPlan, year);
				this.onPlanValueSubmit();
			},

			onProjectUsersNextYearSubmit: function () {
				const detailModel = this.getView().getModel("detail");
				const project = detailModel.getProperty("/project");
				const workersPlan = detailModel.getProperty("/workersPlanNextYear");
				const year = new Date().getFullYear() + 1;

				this._saveProjectUsers(project.id, workersPlan, year);
			},

			_saveProjectUsers: async function (projectId, users, year) {
				try {
					await fetch(`/api/v1/saveProjectUsersIntoDB`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							projectId,
							users,
							year,
						}),
					});

					MessageToast.show(this._i18n.getText("successSavingProjectUsers"));
				} catch (e) {
					MessageBox.error(this._i18n.getText("errorSavingProjectUsers"));
				}
			},

			onPlanValueSubmit: function () {
				const detailData = this.getView().getModel("detail");
				const workersPlan = detailData.getProperty("/workersPlan");
				const workersReality = detailData.getProperty("/workersReality");

				const data = workersReality.map((reality) => {
					const userByMonthReality = {
						user_id: reality.user_id,
						project_id: reality.project_id,
						name: reality.name,
					};
					const userByMonthPlan = workersPlan.find(
						(plan) => plan.user_id === reality.user_id
					);
					this._months.forEach((month) => {
						userByMonthReality[month] = `${reality[month].split("/")[0]}/${
							userByMonthPlan[month]
						}`;
					});

					return userByMonthReality;
				});

				detailData.setProperty("/workersReality", data);
			},

			onRefreshProjectPress: function () {
				const project = this.getView().getModel("detail").getProperty("/project");

				this._initDetail(project);
			},

			_fillMissingMonths: function (data) {
				this._months.forEach((item) => {
					if (!(item in data)) data[item] = 0;
				});
				return data;
			},

			onSearch: function (oEvent) {
				const searchValue = oEvent.getParameter("newValue");
				const projectsList = this.getView().byId("projectsList");
				const aFilters = [];

				if (searchValue) {
					aFilters.push(
						new Filter(
							[new Filter("name", FilterOperator.Contains, searchValue)],
							false
						)
					);
				}

				projectsList.getBinding("items").filter(aFilters, "Application");
			},

			handleSortButtonPressed: async function () {
				const oViewSettingsDialog = await this._getViewSettingsDialog("SortDialog");
				this.getView().addDependent(oViewSettingsDialog);
				oViewSettingsDialog.open();
			},

			handleSortDialogConfirm: async function (oEvent) {
				const projectsList = this.getView().byId("projectsList");
				const sPath = oEvent.getParameters().sortItem.getKey();
				const bDescending = oEvent.getParameters().sortDescending;
				const aSorters = [];

				aSorters.push(new Sorter(sPath, bDescending));

				projectsList.getBinding("items").sort(aSorters);
			},

			handleFilterButtonPressed: async function () {
				const oViewSettingsDialog = await this._getViewSettingsDialog("FilterDialog");
				this.getView().addDependent(oViewSettingsDialog);
				oViewSettingsDialog.open();
			},

			handleFilterDialogConfirm: async function (oEvent) {
				const oVIew = this.getView();
				const projectsList = this.getView().byId("projectsList");
				const filterCompoundKeys = oEvent.getParameters().filterCompoundKeys;
				const sFilterString = oEvent.getParameter("filterString");
				const aFilters = [];

				if (filterCompoundKeys && Object.keys(filterCompoundKeys).length) {
					for (let item of Object.keys(filterCompoundKeys)) {
						const groupFilter = [];

						for (let value of Object.keys(filterCompoundKeys[item])) {
							groupFilter.push(new Filter(item, FilterOperator.EQ, value));
						}
						aFilters.push(new Filter(groupFilter, false));
					}

					if (sFilterString) MessageToast.show(sFilterString);
				}

				projectsList.getBinding("items").filter(aFilters);
				oVIew
					.getModel("metadata")
					.setProperty("/projectsCount", projectsList.getBinding("items").getLength());
			},

			handleGroupButtonPressed: async function () {
				const oViewSettingsDialog = await this._getViewSettingsDialog("GroupDialog");
				this.getView().addDependent(oViewSettingsDialog);
				oViewSettingsDialog.open();
			},

			handleGroupDialogConfirm: function (oEvent) {
				const projectsListBinding = this.getView().byId("projectsList").getBinding("items");
				const mParams = oEvent.getParameters();
				const aGroups = [];
				let sKey, sPath, bDescending;

				if (mParams.groupItem) {
					sKey = mParams.groupItem.getKey();
					bDescending = mParams.groupDescending;

					aGroups.push(
						new Sorter(sKey, bDescending, (oContext) => {
							const item = oContext.getProperty(sKey);
							return { key: item, text: item };
						})
					);
					// apply the selected group settings
				}
				projectsListBinding.sort(aGroups);
			},

			_getViewSettingsDialog: async function (sDialogFragmentName) {
				let pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

				if (!pDialog) {
					pDialog = await Fragment.load({
						id: this.getView().getId(),
						name:
							"sap.ui.demo.basicTemplate.view.UtilizationByProjectFragments." +
							sDialogFragmentName,
						controller: this,
					});
					this._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
				}
				return pDialog;
			},

			onNavBack: function () {
				const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("main");
			},
		});
	}
);
