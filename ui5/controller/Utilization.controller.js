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
		"sap/ui/export/Spreadsheet",
		"sap/ui/export/library",
		"sap/m/ViewSettingsItem",
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
		Fragment,
		Spreadsheet,
		exportLibrary
	) {
		"use strict";

		return Controller.extend("sap.ui.demo.basicTemplate.controller.Utilization", {
			formatter: formatter,

			onInit: async function () {
				sap.ui.core.BusyIndicator.show();
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
				const i18nModel = new ResourceModel({
					bundleName: "sap.ui.demo.basicTemplate.i18n.i18n",
				});
				this.getView().setModel(i18nModel, "i18n");
				this.getView().setModel(
					new JSONModel({
						users: [],
						issues: [],
						crmCases: [],
						metadata: {
							usersCount: 0,
						},
					})
				);
				this.getView().setModel(
					new JSONModel({
						user: null,
						planProjects: [],
						planProjectsNextYear: [],
						planPresale: [],
						planPresaleNextYear: [],
						planOffers: [],
						planOffersNextYear: [],
						//planOpportunities: [],
						realRealPlan: [],
						realRealPlanPrev: [],
					}),
					"detail"
				);

				const usersPromise = this._loadUsers();
				const contactsPromise = this._loadContacts();
				const dataPromise = this._loadData();

				let [users, contacts] = await Promise.all([
					usersPromise,
					contactsPromise,
					dataPromise,
				]);

				users = users.map((user) => {
					const userCfContact = user?.custom_fields?.custom_field.find(
						(item) => item._attributes.id === 119
					);
					const contact = contacts.find((item) => item.id === userCfContact?.id);
					const mainCompetence = contact?.custom_fields?.custom_field.find(
						(item) => item._attributes.id === 44
					);

					return { ...user, main_competence: mainCompetence?.value || "" };
				});

				this.getView().getModel().setProperty("/users", users);

				this.getView()
					.getModel()
					.setProperty("/metadata", {
						...this.getView().getModel().getProperty("/metadata"),
						usersCount: users.length,
					});

				sap.ui.core.BusyIndicator.hide();
			},

			_loadData: async function () {
				sap.ui.core.BusyIndicator.show();
				const oView = this.getView();
				const oBundle = oView.getModel("i18n").getResourceBundle();

				const issuesPromise = this._loadIssues();
				const crmCasesPromise = this._loadCrmCases();
				const workingTimeFundPromise = this._loadWorkingTimeFund();

				let [issues, crmCases, workingTimeFund] = await Promise.all([
					issuesPromise,
					crmCasesPromise,
					workingTimeFundPromise,
				]);

				oView.getModel().setProperty("/issues", issues);
				oView.getModel().setProperty("/crmCases", crmCases);

				workingTimeFund = workingTimeFund.filter(
					(item) => item.easy_attendance_activity.name !== "Svátek"
				);

				const workingTimeFundByMonth =
					this._calculateWorikngTimeFundByMonth(workingTimeFund);
				const workingTimeFundPrevByMonth =
					this._calculateWorikngTimeFundPrevByMonth(workingTimeFund);

				const realEvalTable = [
					{
						id: 1,
						rowTitle: oBundle.getText("workingTimeFund"),
						...this._calculateWorikngTimeFundByMonth(
							workingTimeFund.filter((item) => {
								const today = new Date();
								today.setHours(23, 59, 59);

								return new Date(item.arrival) <= today;
							})
						),
					},
					{ id: 2, rowTitle: oBundle.getText("absenceMD") },
					{ id: 3, rowTitle: oBundle.getText("timeWorked") },
				//	{ id: 4, rowTitle: oBundle.getText("utilization") }, //
					{ id: 5, rowTitle: oBundle.getText("invoicedTime") },
				];
				oView.getModel("detail").setProperty("/realEval", realEvalTable);

				const realEvalPrevTable = [
					{
						name: "workingTimeFund",
						rowTitle: oBundle.getText("workingTimeFund"),
						...workingTimeFundPrevByMonth,
					},
					{ name: "absence", rowTitle: oBundle.getText("absenceMD") },
					{ name: "workingTime", rowTitle: oBundle.getText("timeWorked") },
				//	{ name: "utilization", rowTitle: oBundle.getText("utilization") }, //
					{ name: "invoicedTime", rowTitle: oBundle.getText("invoicedTime") },
				];
				oView.getModel("detail").setProperty("/realEvalPrev", realEvalPrevTable);

				const planEvalTable = [
					{
						name: "workingTimeFund",
						rowTitle: oBundle.getText("workingTimeFund"),
						...workingTimeFundByMonth,
					},
					{ name: "absence", rowTitle: oBundle.getText("absenceMD") },
					{ name: "workingTime", rowTitle: oBundle.getText("workingTime") },
					{ name: "availableCapacity", rowTitle: oBundle.getText("availableCapacity") },
					{ name: "plannedProjects", rowTitle: oBundle.getText("plannedProjects") },
					{ name: "plannedOffers", rowTitle: oBundle.getText("plannedOffers") },
					{ name: "freeCapacity", rowTitle: oBundle.getText("freeCapacity") },
				];
				oView.getModel("detail").setProperty("/planEval", planEvalTable);

				const workingTimeFundByMonthNextYear =
					this._calculateWorikngTimeFundByMonthNextYear(workingTimeFund);

				const planEvalTableNextYear = [
					{
						name: "workingTimeFund",
						rowTitle: oBundle.getText("workingTimeFund"),
						...workingTimeFundByMonthNextYear,
					},
					{ name: "absence", rowTitle: oBundle.getText("absenceMD") },
					{ name: "workingTime", rowTitle: oBundle.getText("workingTime") },
					{ name: "availableCapacity", rowTitle: oBundle.getText("availableCapacity") },
					{ name: "plannedProjects", rowTitle: oBundle.getText("plannedProjects") },
					{ name: "plannedOffers", rowTitle: oBundle.getText("plannedOffers") },
					{ name: "freeCapacity", rowTitle: oBundle.getText("freeCapacity") },
				];
				oView.getModel("detail").setProperty("/planEvalNextYear", planEvalTableNextYear);

				const currentYear = new Date().getFullYear();

				oView.getModel().setProperty(
					"/crmIssues",
					issues.filter((issue) => {
						const startYear = new Date(issue.start_date).getFullYear();
						const endYear = issue.due_date
							? new Date(issue.due_date).getFullYear()
							: 9999;

						return (
							issue.project._attributes.id === 417 &&
							startYear <= currentYear &&
							endYear >= currentYear
						);
					})
				);

				oView.getModel().setProperty(
					"/crmIssuesNextYear",
					issues.filter((issue) => {
						const startYear = new Date(issue.start_date).getFullYear();
						const endYear = issue.due_date
							? new Date(issue.due_date).getFullYear()
							: 9999;

						return (
							issue.project._attributes.id === 417 &&
							startYear <= currentYear + 1 &&
							endYear >= currentYear + 1
						);
					})
				);

				oView.getModel().setProperty(
					"/crmIssuesPrev",
					issues.filter((issue) => {
						const startYear = new Date(issue.start_date).getFullYear();
						const endYear = issue.due_date
							? new Date(issue.due_date).getFullYear()
							: 9999;

						return (
							issue.project._attributes.id === 417 &&
							startYear <= currentYear - 1 &&
							endYear >= currentYear - 1
						);
					})
				);

				sap.ui.core.BusyIndicator.show();
			},

			_loadUsers: async function () {
				const users = [];

				try {
					const response = await fetch("/api/v1/getAllUsers", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								include: "memberships",
								status: 1,
								lastname: "!~easy",
								sort: "created_on",
								//cf_154: encodeURIComponent("Interní|Externí"),
							},
						}),
					});
					users.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingUsers"));
				}

				return users;
			},

			_loadContacts: async function () {
				const contacts = [];

				try {
					const response = await fetch("/api/v1/getContacts", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								type_id: "1|2",
								sort: "created_on",
							},
						}),
					});
					contacts.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingContacts"));
				}

				return contacts;
			},

			_loadWorkingTimeFund: async function () {
				const workingTimeFund = [];

				try {
					const response = await fetch("/api/v1/getAttendances", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								user_id: 184,
								sort: "created_at",
							},
						}),
					});

					workingTimeFund.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingAttendance"));
				}

				return workingTimeFund;
			},

			_loadAttendance: async function (userId) {
				const attendance = [];

				try {
					const response = await fetch("/api/v1/getAttendances", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								user_id: userId,
								sort: "created_at",
							},
						}),
					});

					attendance.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingAttendance"));
				}

				return attendance;
			},

			_loadTimeEntries: async function (userId) {
				const timeEntries = [];

				try {
					const response = await fetch("/api/v1/timeSpent", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								user_id: userId,
								spent_on: "current_year",
								sort: "created_on",
								// xproject_id: "!427",
								// xproject_id: userProjectsIds.filter((id) => id !== 427).join("|"),
							},
						}),
					});

					timeEntries.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingTimeEntries"));
				}

				return timeEntries;
			},

			_loadTimeEntriesNextYear: async function (userId) {
				const timeEntries = [];

				try {
					const response = await fetch("/api/v1/timeSpent", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								user_id: userId,
								spent_on: "next_fiscal_year",
								sort: "created_on",
								// xproject_id: "!427",
								// xproject_id: userProjectsIds.filter((id) => id !== 427).join("|"),
							},
						}),
					});

					timeEntries.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingTimeEntries"));
				}

				return timeEntries;
			},

			_loadTimeEntriesPrev: async function (userId) {
				const timeEntries = [];

				try {
					const response = await fetch("/api/v1/timeSpent", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								user_id: userId,
								spent_on: "last_fiscal_year",
								sort: "created_on",
							},
						}),
					});

					timeEntries.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingTimeEntries"));
				}

				return timeEntries;
			},

			_loadProjectsFromDB: async function (user, userProjectsIds) {
				const data = [];

				try {
					const response = await fetch("/api/v1/getProjectsFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							projects: userProjectsIds,
							year: new Date().getFullYear(),
						}),
					});

					data.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingProjectsPlans"));
				}

				return data;
			},

			_loadProjectsPrevFromDB: async function (user, userProjectsIds) {
				const data = [];

				try {
					const response = await fetch("/api/v1/getProjectsFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							projects: userProjectsIds,
							year: new Date().getFullYear() - 1,
						}),
					});

					data.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingProjectsPlans"));
				}

				return data;
			},

			_loadProjectsNextYearFromDB: async function (user, userProjectsIds) {
				const data = [];

				try {
					const response = await fetch("/api/v1/getProjectsFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							projects: userProjectsIds,
							year: new Date().getFullYear() + 1,
						}),
					});

					data.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingProjectsPlans"));
				}

				return data;
			},

			_loadProjectsPrevFromDB: async function (user, userProjectsIds) {
				const data = [];

				try {
					const response = await fetch("/api/v1/getProjectsFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							projects: userProjectsIds,
							year: new Date().getFullYear() - 1,
						}),
					});

					data.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingProjectsPlans"));
				}

				return data;
			},

			/*_loadProjects: async function () {
				const projects = [];
				try {
					const response = await fetch("/api/v1/getallprojects", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								//is_closed: 0,
							},
						}),
					});

					projects.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingProjectsPlans"));
				}

				return projects;
			},*/

			_loadIssues: async function () {
				const issues = [];
				try {
					const response = await fetch("/api/v1/issues", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								// "f[status_id]": "3|15|16",
								"f[status_id]": "3|4|15|16",
								sort: "created_on",
							},
						}),
					});

					issues.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingIssues"));
				}

				return issues;
			},

			_loadCrmCases: async function () {
				const crmCases = [];
				try {
					const response = await fetch("/api/v1/getCRMCases", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							"f[easy_crm_case_status_id]": "3|9",
							sort: "created_at",
						}),
					});

					crmCases.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingCrmCases"));
				}

				return crmCases;
			},

			// _loadCrmProjectIssues: async function () {
			// 	const projects = [];
			// 	try {
			// 		const response = await fetch("/api/v1/getProjectIssues/417", {
			// 			method: "POST",
			// 			headers: { "Content-Type": "application/json" },
			// 		});

			// 		projects.push(...(await response.json()));
			// 	} catch (e) {
			// 		const oBundle = this.getView().getModel("i18n").getResourceBundle();
			// 		MessageBox.error(oBundle.getText("errorLoadingProjectsPlans"));
			// 	}

			// 	return projects;
			// },

			_loadCrmProjectIssuesFromDB: async function (user, issues) {
				const projects = [];
				try {
					const response = await fetch("/api/v1/getCrmIssuesFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							issues,
							year: new Date().getFullYear(),
						}),
					});

					projects.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingCrmProjectIssues"));
				}

				return projects;
			},

			_loadCrmProjectIssuesPrevFromDB: async function (user, issues) {
				const projects = [];
				try {
					const response = await fetch("/api/v1/getCrmIssuesFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							issues,
							year: new Date().getFullYear() - 1,
						}),
					});

					projects.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingCrmProjectIssues"));
				}

				return projects;
			},

			_loadCrmProjectIssuesNextYearFromDB: async function (user, issues) {
				const projects = [];
				try {
					const response = await fetch("/api/v1/getCrmIssuesFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							issues,
							year: new Date().getFullYear() + 1,
						}),
					});

					projects.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingCrmProjectIssues"));
				}

				return projects;
			},

			_loadCrmProjectIssuesPrevFromDB: async function (user, issues) {
				const projects = [];
				try {
					const response = await fetch("/api/v1/getCrmIssuesFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							issues,
							year: new Date().getFullYear() - 1,
						}),
					});

					projects.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingCrmProjectIssues"));
				}

				return projects;
			},

			_loadWorkingTimeFromDB: async function (user, year) {
				let workingTime = [];
				try {
					const response = await fetch("/api/v1/getWorkingTimeFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							year,
						}),
					});

					workingTime.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingWorkingTime"));
				}

				return workingTime;
			},

			_saveWorkingTimeIntoDB: async function (year, workingTime) {
				const detailData = this.getView().getModel("detail").getData();
				const oBundle = this.getView().getModel("i18n").getResourceBundle();

				const dataToSave = {
					user: detailData.user.id,
					year,
					workingTime,
				};

				try {
					await fetch("/api/v1/saveWorkingTimeIntoDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							...dataToSave,
						}),
					});
					MessageToast.show(oBundle.getText("successSavingWorkingTimePlans"));
				} catch (e) {
					MessageBox.error(oBundle.getText("errorSavingWorkingTimePlans"));
				}
			},

			_saveProjectsIntoDB: async function (year, data) {
				const detailData = this.getView().getModel("detail").getData();
				const oBundle = this.getView().getModel("i18n").getResourceBundle();

				const dataToSave = {
					user: detailData.user.id,
					year,
					projects: detailData[data],
				};

				try {
					await fetch("/api/v1/saveProjectsIntoDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							...dataToSave,
						}),
					});
					MessageToast.show(oBundle.getText("successSavingProjectsPlans"));
				} catch (e) {
					MessageBox.error(oBundle.getText("errorSavingProjectsPlans"));
				}
			},

			_saveCrmProjectIssuesIntoDB: async function (year, data) {
				const detailData = this.getView().getModel("detail").getData();
				const oBundle = this.getView().getModel("i18n").getResourceBundle();

				const dataToSave = {
					user: detailData.user.id,
					year,
					issues: detailData[data],
				};
				try {
					await fetch("/api/v1/saveCrmProjectIssuesIntoDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							...dataToSave,
						}),
					});
					MessageToast.show(oBundle.getText("successSavingCrmProjectIssues"));
				} catch (e) {
					MessageBox.error(oBundle.getText("errorSavingCrmProjectIssues"));
				}
			},

			_saveOffersIntoDB: async function (year, data) {
				const detailData = this.getView().getModel("detail").getData();
				const oBundle = this.getView().getModel("i18n").getResourceBundle();

				const dataToSave = {
					user: detailData.user.id,
					year,
					offers: detailData[data],
				};
				try {
					await fetch("/api/v1/saveOffersIntoDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							...dataToSave,
						}),
					});
					MessageToast.show(oBundle.getText("successSavingOffers"));
				} catch (e) {
					MessageBox.error(oBundle.getText("errorSavingOffers"));
				}
			},

			// _saveOpprotunitiesIntoDB: async function () {
			// 	const detailData = this.getView().getModel("detail").getData();
			// 	const oBundle = this.getView().getModel("i18n").getResourceBundle();

			// 	if (!detailData.planOpportunities.length) {
			// 		MessageToast.show(oBundle.getText("errorNoOpportunities"));
			// 		return;
			// 	}

			// 	const dataToSave = {
			// 		user: detailData.user.id,
			// 		year: new Date().getFullYear(),
			// 		opportunities: detailData.planOpportunities,
			// 	};

			// 	try {
			// 		const response = await fetch("/api/v1/saveOpportunitiesIntoDB", {
			// 			method: "POST",
			// 			headers: { "Content-Type": "application/json" },
			// 			body: JSON.stringify({
			// 				...dataToSave,
			// 			}),
			// 		});
			// 		MessageToast.show(oBundle.getText("successSavingOpportunities"));
			// 		return await response.json();
			// 	} catch (e) {
			// 		MessageBox.error(oBundle.getText("errorSavingOpportunities"));
			// 		return [];
			// 	}
			// },

			// _loadOpportunitiesFromDB: async function (user) {
			// 	const opportunities = [];
			// 	try {
			// 		const response = await fetch("/api/v1/getOpportunitiesFromDB", {
			// 			method: "POST",
			// 			headers: { "Content-Type": "application/json" },
			// 			body: JSON.stringify({
			// 				user,
			// 				year: new Date().getFullYear(),
			// 			}),
			// 		});

			// 		opportunities.push(...(await response.json()));
			// 	} catch (e) {
			// 		const oBundle = this.getView().getModel("i18n").getResourceBundle();
			// 		MessageBox.error(oBundle.getText("errorLoadingOpportunities"));
			// 	}

			// 	return opportunities;
			// },

			_loadOffersFromDB: async function (user) {
				const offers = [];
				try {
					const response = await fetch("/api/v1/getOffersFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							year: new Date().getFullYear(),
						}),
					});

					offers.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingOffers"));
				}

				return offers;
			},

			_loadOffersPrevFromDB: async function (user) {
				const offers = [];
				try {
					const response = await fetch("/api/v1/getOffersFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							year: new Date().getFullYear() - 1,
						}),
					});

					offers.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingOffers"));
				}

				return offers;
			},

			_loadOffersNextYearFromDB: async function (user) {
				const offers = [];
				try {
					const response = await fetch("/api/v1/getOffersFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							user,
							year: new Date().getFullYear() + 1,
						}),
					});

					offers.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingOffers"));
				}

				return offers;
			},

			// _deleteOpportunityFromDB: async function (opportunity_id) {
			// 	try {
			// 		await fetch("/api/v1/deleteOpportunityFromDB", {
			// 			method: "DELETE",
			// 			headers: { "Content-Type": "application/json" },
			// 			body: JSON.stringify({
			// 				opportunity_id,
			// 			}),
			// 		});

			// 		return true;
			// 	} catch (e) {
			// 		return false;
			// 	}
			// },

			onExportAvailableCapacityPress: async function () {
				sap.ui.core.BusyIndicator.show();
				const EdmType = exportLibrary.EdmType;
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const users = this.getView().getModel().getProperty("/users");
				const usersIndices = this.getView().byId("usersList").getBinding("items").aIndices;
				const issues = this.getView().getModel().getProperty("/issues");
				const detailData = this.getView().getModel("detail").getData();
				const workingTimeFundByMonthPlan = detailData.planEval.find(
					(item) => item.name === "workingTimeFund"
				);
				const filteredUsers = users.filter((user, index) => usersIndices.includes(index));

				const currentYear = new Date().getFullYear();

				const projectsPromise = this._loadProjectsFromDB(null, null);
				const workingTimePromise = this._loadWorkingTimeFromDB(
					filteredUsers.map((user) => user.id),
					currentYear
				);

				const [projects, workingTime] = await Promise.all([
					projectsPromise,
					workingTimePromise,
				]);

				const promises = filteredUsers.map((user) => {
					return new Promise(async (resolve, reject) => {
						const absencePromise = this._loadAttendance(user.id).then((attendance) =>
							this._calculateAbsenceByMonth(attendance)
						);
						const timeEntriesPromise = this._loadTimeEntries(user.id);
						const userIssues = issues.filter(
							(item) =>
								item.assigned_to?._attributes.id === user.id &&
								item.status._attributes.id !== 4
						);
						const uniqueProjectsFromIssues = userIssues.filter(
							(item, index, self) =>
								index ===
								self.findIndex(
									(t) => t.project._attributes.id === item.project._attributes.id
								)
						);
						const userProjects = projects.filter(
							(project) =>
								project.user_id === user.id &&
								uniqueProjectsFromIssues
									.map((item) => item.project._attributes.id)
									.includes(project.project_id)
						);

						const userWorkingTime = this._fillWorkingTime(
							workingTime.find((item) => item.user_id === user.id) ?? {}
						);

						let [absenceByMonth, timeEntries] = await Promise.all([
							absencePromise,
							timeEntriesPromise,
						]);

						const projectsTimeWorkedByMonthPlan =
							this._getProjectsTimeWorkedByMonthPlan(
								userIssues.filter(
									(item) =>
										item.project._attributes.id !== 417 &&
										item.status._attributes.id !== 4
								),
								timeEntries.filter((item) => item.project._attributes.id !== 417)
							);

						const projectsTimeWorkedCombined = projectsTimeWorkedByMonthPlan.map(
							(item) => {
								const planProject = userProjects.find(
									(plan) => plan.project_id === item.id
								);
								if (planProject) {
									return {
										id: planProject.project_id,
										name: item.name,
										...planProject,
									};
								}
								return {
									id: item.id,
									name: item.name,
									...this._fillMissingMonths({}),
								};
							}
						);

						const plannedProjectsByMonth = this._calculatePlannedByMonth(
							projectsTimeWorkedCombined
						);

						const availableCapacityByMonth = this._calculateAvailableCapacityByMonth({
							workingTimeFundByMonthPlan,
							absenceByMonth,
							workingTime: userWorkingTime,
						});

						const freeCapacityByMonth = this._calculateFreeCapacityByMonth({
							availableCapacityByMonth,
							plannedByMonth: plannedProjectsByMonth,
						});

						const overviewData = {
							id: user.id,
							rowTitle: `${user.firstname} ${user.lastname}`,
							competence: user.main_competence,
							relationship:
								user?.custom_fields?.custom_field.find(
									(cf) => cf?._attributes?.id === 154
								)?.value || "",
						};

						this._months.forEach((month) => {
							overviewData[month] = {
								value: formatter.roundTo3Decimals(freeCapacityByMonth[month]),
								percent: formatter.formatPercent(
									(freeCapacityByMonth[month] * 100) /
										availableCapacityByMonth[month]
								),
							};
						});

						resolve(overviewData);
					});
				});

				const data = await Promise.all(promises);

				const columns = [
					{ label: oBundle.getText("freeCapacity"), property: "rowTitle", width: 24 },
					{ label: oBundle.getText("relationship"), property: "relationship", width: 14 },
					{ label: oBundle.getText("competence"), property: "competence", width: 14 },
				];
				this._months.forEach((month) => {
					const columnValue = {
						label: `${oBundle.getText(month)} - MD`,
						property: `${month}/value`,
						type: EdmType.Number,
						scale: 3,
						textAlign: "end",
					};
					const columnPercent = {
						label: "%",
						property: `${month}/percent`,
						textAlign: "end",
					};
					columns.push(columnValue, columnPercent);
				});

				sap.ui.core.BusyIndicator.hide();

				this._exportData(oBundle.getText("freeCapacitiesOverview"), columns, data);
			},

			onExportAvailableCapacityNextYearPress: async function () {
				sap.ui.core.BusyIndicator.show();
				const EdmType = exportLibrary.EdmType;
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const users = this.getView().getModel().getProperty("/users");
				const usersIndices = this.getView().byId("usersList").getBinding("items").aIndices;
				const crmIssues = this.getView().getModel().getProperty("/crmIssuesNextYear");
				const issues = this.getView().getModel().getProperty("/issues");
				const detailData = this.getView().getModel("detail").getData();
				const workingTimeFundByMonthPlan = detailData.planEvalNextYear.find(
					(item) => item.name === "workingTimeFund"
				);
				const filteredUsers = users.filter((user, index) => usersIndices.includes(index));

				const nextYear = new Date().getFullYear() + 1;

				const projectsPromise = this._loadProjectsNextYearFromDB(null, null);
				const offersPromise = this._loadOffersNextYearFromDB(null);
				const crmIssuesPromise = this._loadCrmProjectIssuesNextYearFromDB(null, []);
				const workingTimePromise = this._loadWorkingTimeFromDB(
					filteredUsers.map((user) => user.id),
					nextYear
				);

				const [projects, offers, crms, workingTime] = await Promise.all([
					projectsPromise,
					offersPromise,
					crmIssuesPromise,
					workingTimePromise,
				]);

				const promises = filteredUsers.map((user) => {
					return new Promise(async (resolve, reject) => {
						const absencePromise = this._loadAttendance(user.id).then((attendance) =>
							this._calculateAbsenceByMonthNextYear(attendance)
						);
						const userOffers = offers.filter((offer) => offer.user_id === user.id);
						const userOffersByMonth = this._getOffersByMonth(userOffers);
						const timeEntriesPromise = this._loadTimeEntriesNextYear(user.id);
						const userCrm = crms.filter(
							(crm) =>
								crm.assigned_to === user.id &&
								crmIssues.map((crmIssue) => crmIssue.id).includes(crm.issue_id)
						);
						const userIssues = issues.filter(
							(item) =>
								item.assigned_to?._attributes.id === user.id &&
								item.status._attributes.id !== 4
						);
						const uniqueProjectsFromIssues = userIssues.filter(
							(item, index, self) =>
								index ===
								self.findIndex(
									(t) => t.project._attributes.id === item.project._attributes.id
								)
						);
						const userProjects = projects.filter(
							(project) =>
								project.user_id === user.id &&
								uniqueProjectsFromIssues
									.map((item) => item.project._attributes.id)
									.includes(project.project_id)
						);
						const userWorkingTime = this._fillWorkingTime(
							workingTime.find((item) => item.user_id === user.id) ?? {}
						);

						let [absenceByMonth, timeEntries] = await Promise.all([
							absencePromise,
							timeEntriesPromise,
						]);

						const projectsTimeWorkedByMonthPlan =
							this._getProjectsTimeWorkedByMonthPlan(
								userIssues.filter(
									(item) =>
										item.project._attributes.id !== 417 &&
										item.status._attributes.id !== 4
								),
								timeEntries.filter((item) => item.project._attributes.id !== 417)
							);

						const crmIssuesByMonth = this._calculateCrmIssuesByMonth(
							timeEntries,
							crmIssues.filter(
								(crmIssue) =>
									crmIssue.assigned_to?._attributes.id === user.id &&
									crmIssue.status._attributes.id !== 4
							)
						);

						const projectsTimeWorkedCombined = projectsTimeWorkedByMonthPlan.map(
							(item) => {
								const planProject = userProjects.find(
									(plan) => plan.project_id === item.id
								);
								if (planProject) {
									return {
										id: planProject.project_id,
										name: item.name,
										...planProject,
									};
								}
								return {
									id: item.id,
									name: item.name,
									...this._fillMissingMonths({}),
								};
							}
						);

						const crmProjectIssuesCombined = crmIssuesByMonth.map((item) => {
							const crmIssue = userCrm.find((issue) => issue.issue_id === item.id);
							if (crmIssue) {
								return {
									id: crmIssue.issue_id,
									subject: item.subject,
									...crmIssue,
								};
							}
							return {
								id: item.id,
								subject: item.subject,
								...this._fillMissingMonths({}),
							};
						});

						const plannedProjectsByMonth = this._calculatePlannedByMonth(
							projectsTimeWorkedCombined
						);

						const availableCapacityByMonth = this._calculateAvailableCapacityByMonth({
							workingTimeFundByMonthPlan,
							absenceByMonth,
							workingTime: userWorkingTime,
						});

						const freeCapacityByMonth = this._calculateFreeCapacityByMonth({
							availableCapacityByMonth,
							plannedByMonth: plannedProjectsByMonth,
						});

						const overviewData = {
							id: user.id,
							rowTitle: `${user.firstname} ${user.lastname}`,
							competence: user.main_competence,
							relationship:
								user?.custom_fields?.custom_field.find(
									(cf) => cf?._attributes?.id === 154
								)?.value || "",
						};

						this._months.forEach((month) => {
							overviewData[month] = {
								value: formatter.roundTo3Decimals(freeCapacityByMonth[month]),
								percent: formatter.formatPercent(
									(freeCapacityByMonth[month] * 100) /
										availableCapacityByMonth[month]
								),
							};
						});

						resolve(overviewData);
					});
				});

				const data = await Promise.all(promises);

				const columns = [
					{ label: oBundle.getText("freeCapacity"), property: "rowTitle", width: 24 },
					{ label: oBundle.getText("relationship"), property: "relationship", width: 14 },
					{ label: oBundle.getText("competence"), property: "competence", width: 14 },
				];
				this._months.forEach((month) => {
					const columnValue = {
						label: `${oBundle.getText(month)} - MD`,
						property: `${month}/value`,
						type: EdmType.Number,
						scale: 3,
						textAlign: "end",
					};
					const columnPercent = {
						label: "%",
						property: `${month}/percent`,
						textAlign: "end",
					};
					columns.push(columnValue, columnPercent);
				});

				sap.ui.core.BusyIndicator.hide();

				this._exportData(
					`${oBundle.getText("freeCapacitiesOverview")} ${nextYear}`,
					columns,
					data
				);
			},

			onExportRealityAllUsers: async function () {
				sap.ui.core.BusyIndicator.show();
				const masterData = this.getView().getModel().getData();
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const users = this.getView().getModel().getProperty("/users");
				const usersIndices = this.getView().byId("usersList").getBinding("items").aIndices;
				const filteredUsers = users.filter((user, index) => usersIndices.includes(index));
				const workingTimeFundByMonth = this.getView()
					.getModel("detail")
					.getProperty("/planEval")
					.find((item) => item.name === "workingTimeFund");
				const projectsPlansPromise = this._loadProjectsFromDB(null, null);
				const [projectsPlans] = await Promise.all([projectsPlansPromise]);

				const data = [];

				data.push({
					...workingTimeFundByMonth,
					rowTitle: "",
					description: "Fond pracovní doby",
				});

				for (const user of filteredUsers) {
					const timeEntries = await this._loadTimeEntries(user.id);
					const timeWorkedByMonth = this._calculateTimeWorkedByMonth(timeEntries);

					const attendance = await this._loadAttendance(user.id);
					const realityAbsenceByMonth = this._calculateAbsenceByMonth(
						attendance.filter((item) => {
							const arrival = new Date(item.arrival);
							const today = new Date();
							today.setHours(23, 59, 59);

							return arrival < today;
						})
					);
					const invoicedTimeByMonth = this._calculateInvoicedTimeByMonth({
						realityAbsenceByMonth,
						timeEntries,
					});

					const userIssues = masterData.issues.filter(
						(item) => item.assigned_to?._attributes.id === user.id
					);
					const uniqueProjectsFromIssues = userIssues.filter(
						(item, index, self) =>
							index ===
							self.findIndex(
								(t) => t.project._attributes.id === item.project._attributes.id
							)
					);
					const projectsTimeWorkedByMonthPlan = this._getProjectsTimeWorkedByMonthPlan(
						userIssues.filter(
							(item) =>
								item.project._attributes.id !== 417 &&
								item.status._attributes.id !== 4
						),
						timeEntries.filter((item) => item.project._attributes.id !== 417)
					);
					const projectsIds = uniqueProjectsFromIssues.map(
						(item) => item.project._attributes.id
					);
					const userProjectsPlans = projectsPlans.filter(
						(plan) => plan.user_id === user.id && projectsIds.includes(plan.project_id)
					);
					const projectsTimeWorkedCombined = projectsTimeWorkedByMonthPlan.map((item) => {
						const planProject = userProjectsPlans.find(
							(plan) => plan.project_id === item.id
						);
						if (planProject) {
							return { id: planProject.project_id, name: item.name, ...planProject };
						}
						return {
							id: item.id,
							name: item.name,
							...this._fillMissingMonths({}),
						};
					});

					const plannedProjectsByMonth = this._calculatePlannedByMonth(
						projectsTimeWorkedCombined
					);

					const workedDays = {
						description: "Skutečně odpracované dny",
					};
					const invoicableTime = { description: "Fakturovatelný čas" };
					const workedTimeRatio = {
						description: "Odpracované/Naplánované dny",
					};
					this._months.forEach((month) => {
						let plannedByMonthValue = formatter.formatPercent(0);

						if (plannedProjectsByMonth[month] === 0) {
							if (timeWorkedByMonth[month] !== 0) {
								plannedByMonthValue = formatter.formatPercent(-100);
							}
						} else {
							plannedByMonthValue = formatter.formatPercent(
								(timeWorkedByMonth[month] / plannedProjectsByMonth[month]) * 100
							);
						}

						workedDays[month] = formatter.roundTo3Decimals(timeWorkedByMonth[month]);
						invoicableTime[month] = invoicedTimeByMonth[month].replace(".", ",");
						workedTimeRatio[month] = plannedByMonthValue.replace(".", ",");
					});

					data.push({ rowTitle: `${user.firstname} ${user.lastname}` });
					data.push(workedDays);
					data.push(invoicableTime);
					data.push(workedTimeRatio);
				}

				const columns = [
					{ label: oBundle.getText("worker"), property: "rowTitle", width: 24 },
					{ label: oBundle.getText("description"), property: "description", width: 36 },
					...this._months.map((month) => {
						return { label: oBundle.getText(month), property: month };
					}),
				];

				sap.ui.core.BusyIndicator.hide();

				this._exportData(`${oBundle.getText("reality")}`, columns, data);
			},

			onExportRealityAllUsersPrev: async function () {
				sap.ui.core.BusyIndicator.show();
				const masterData = this.getView().getModel().getData();
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const users = this.getView().getModel().getProperty("/users");
				const usersIndices = this.getView().byId("usersList").getBinding("items").aIndices;
				const filteredUsers = users.filter((user, index) => usersIndices.includes(index));
				const workingTimeFundByMonth = this.getView()
					.getModel("detail")
					.getProperty("/realEvalPrev")
					.find((item) => item.name === "workingTimeFund");
				const projectsPlansPromise = this._loadProjectsPrevFromDB(null, null);
				const [projectsPlans] = await Promise.all([projectsPlansPromise]);

				const data = [];

				data.push({
					...workingTimeFundByMonth,
					rowTitle: "",
					description: "Fond pracovní doby",
				});

				for (const user of filteredUsers) {
					const timeEntries = await this._loadTimeEntriesPrev(user.id);
					const timeWorkedByMonth = this._calculateTimeWorkedByMonth(timeEntries);

					const attendance = await this._loadAttendance(user.id);
					const realityAbsenceByMonth = this._calculateAbsencePrevByMonth(
						attendance.filter((item) => {
							const arrival = new Date(item.arrival);
							const arrivalYear = arrival.getFullYear();
							const prevYear = new Date().getFullYear() - 1;

							return arrivalYear === prevYear;
						})
					);
					const invoicedTimeByMonth = this._calculateInvoicedTimePrevByMonth({
						realityAbsenceByMonth,
						timeEntries,
					});

					const userIssues = masterData.issues.filter(
						(item) => item.assigned_to?._attributes.id === user.id
					);
					const uniqueProjectsFromIssues = userIssues.filter(
						(item, index, self) =>
							index ===
							self.findIndex(
								(t) => t.project._attributes.id === item.project._attributes.id
							)
					);
					const projectsTimeWorkedByMonthPlan = this._getProjectsTimeWorkedByMonthPlan(
						userIssues.filter(
							(item) =>
								item.project._attributes.id !== 417 &&
								item.status._attributes.id !== 4
						),
						timeEntries.filter((item) => item.project._attributes.id !== 417)
					);
					const projectsIds = uniqueProjectsFromIssues.map(
						(item) => item.project._attributes.id
					);
					const userProjectsPlans = projectsPlans.filter(
						(plan) => plan.user_id === user.id && projectsIds.includes(plan.project_id)
					);
					const projectsTimeWorkedCombined = projectsTimeWorkedByMonthPlan.map((item) => {
						const planProject = userProjectsPlans.find(
							(plan) => plan.project_id === item.id
						);
						if (planProject) {
							return { id: planProject.project_id, name: item.name, ...planProject };
						}
						return {
							id: item.id,
							name: item.name,
							...this._fillMissingMonths({}),
						};
					});

					const plannedProjectsByMonth = this._calculatePlannedByMonth(
						projectsTimeWorkedCombined
					);

					const workedDays = {
						description: "Skutečně odpracované dny",
					};
					const invoicableTime = { description: "Fakturovatelný čas" };
					const workedTimeRatio = {
						description: "Odpracované/Naplánované dny",
					};
					this._months.forEach((month) => {
						let plannedByMonthValue = formatter.formatPercent(0);

						if (plannedProjectsByMonth[month] === 0) {
							if (timeWorkedByMonth[month] !== 0) {
								plannedByMonthValue = formatter.formatPercent(-100);
							}
						} else {
							plannedByMonthValue = formatter.formatPercent(
								(timeWorkedByMonth[month] / plannedProjectsByMonth[month]) * 100
							);
						}

						workedDays[month] = formatter.roundTo3Decimals(timeWorkedByMonth[month]);
						invoicableTime[month] = invoicedTimeByMonth[month].replace(".", ",");
						workedTimeRatio[month] = plannedByMonthValue.replace(".", ",");
					});

					data.push({ rowTitle: `${user.firstname} ${user.lastname}` });
					data.push(workedDays);
					data.push(invoicableTime);
					data.push(workedTimeRatio);
				}

				const columns = [
					{ label: oBundle.getText("worker"), property: "rowTitle", width: 24 },
					{ label: oBundle.getText("description"), property: "description", width: 36 },
					...this._months.map((month) => {
						return { label: oBundle.getText(month), property: month };
					}),
				];

				sap.ui.core.BusyIndicator.hide();

				this._exportData(
					`${oBundle.getText("reality")} ${new Date().getFullYear() - 1}`,
					columns,
					data
				);
			},

			onExportPlansAndOffersPress: async function () {
				sap.ui.core.BusyIndicator.show();
				const EdmType = exportLibrary.EdmType;
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const users = this.getView().getModel().getProperty("/users");
				const usersIndices = this.getView().byId("usersList").getBinding("items").aIndices;
				const issues = this.getView().getModel().getProperty("/issues");
				const filteredUsers = users.filter((user, index) => usersIndices.includes(index));

				const projectsPromise = this._loadProjectsFromDB(null, null);
				const offersPromise = this._loadOffersFromDB(null);

				const [projects, offers] = await Promise.all([projectsPromise, offersPromise]);

				const promises = filteredUsers.map((user) => {
					return new Promise(async (resolve, reject) => {

						const dochazka = await this._loadAttendance(user.id) // nacteni dochazky pro vypocet absence
					    const absenceMD = this._calculateAbsenceByMonth(dochazka) //absenceMD
						
						const userOffers = offers.filter((offer) => offer.user_id === user.id);
						const userOffersByMonth = this._getOffersByMonth(userOffers);
						const timeEntriesPromise = this._loadTimeEntries(user.id);
						const userIssues = issues.filter(
							(item) =>
								item.assigned_to?._attributes.id === user.id &&
								item.status._attributes.id !== 4
						);
						const uniqueProjectsFromIssues = userIssues.filter(
							(item, index, self) =>
								index ===
								self.findIndex(
									(t) => t.project._attributes.id === item.project._attributes.id
								)
						);
						const userProjects = projects.filter(
							(project) =>
								project.user_id === user.id &&
								uniqueProjectsFromIssues
									.map((item) => item.project._attributes.id)
									.includes(project.project_id)
						);

						let [timeEntries] = await Promise.all([timeEntriesPromise]);

						const projectsTimeWorkedByMonthPlan =
							this._getProjectsTimeWorkedByMonthPlan(
								userIssues.filter(
									(item) =>
										item.project._attributes.id !== 417 &&
										item.status._attributes.id !== 4
								),
								timeEntries.filter((item) => item.project._attributes.id !== 417)
							);

						const projectsTimeWorkedCombined = projectsTimeWorkedByMonthPlan.map(
							(item) => {
								const planProject = userProjects.find(
									(plan) => plan.project_id === item.id
								);
								if (planProject) {
									return {
										id: planProject.project_id,
										name: item.name,
										...planProject,
									};
								}
								return {
									id: item.id,
									name: item.name,
									...this._fillMissingMonths({}),
								};
							}
						);

						const userRows = [
							{
								id: user.id,
								rowTitle: `${user.firstname} ${user.lastname}`,
								name: oBundle.getText("absenceMD"), // nadpis
								...absenceMD //data
							},
							{
								rowTitle: "",
								name: oBundle.getText("projectsCapital"),
							},

							...projectsTimeWorkedCombined.sort((a, b) =>
								a.name.localeCompare(b.name)
							),
							{
								rowTitle: "", // prazdny radek								
							},
						];

						const notEmptyOffers = userOffersByMonth.filter((item) => {
							for (let month of this._months) {
								if (item[month] > 0) return true;
							}

							return false;
						});

						if (notEmptyOffers.length) {
							userRows.push({
								name: oBundle.getText("offersTableTitle"),
							});

							userRows.push(
								...notEmptyOffers.sort((a, b) => a.name.localeCompare(b.name))
							);
						}

						resolve(userRows);
					});
				});

				const data = await Promise.all(promises);

				const columns = [
					{ label: oBundle.getText("month"), property: "rowTitle", width: 24 },
					{ label: " ", property: "name", width: 48 },
					...this._months.map((month) => {
						return {
							label: oBundle.getText(month),
							property: month,
							type: EdmType.Number,
							scale: 3,
							textAlign: "end",
							width: 14,
						};
					}),
				];

				sap.ui.core.BusyIndicator.hide();

				this._exportData(oBundle.getText("projectAndOffersPlan"), columns, data.flat(1));
			},

			onExportPlansAndOffersNextYearPress:async function(){
				sap.ui.core.BusyIndicator.show();
				const EdmType = exportLibrary.EdmType;
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const users = this.getView().getModel().getProperty("/users");
				const usersIndices = this.getView().byId("usersList").getBinding("items").aIndices;
				const issues = this.getView().getModel().getProperty("/issues");
				const filteredUsers = users.filter((user, index) => usersIndices.includes(index));

				const projectsPromise = this._loadProjectsNextYearFromDB(null, null);
				const offersPromise = this._loadOffersNextYearFromDB(null);

				const [projects, offers] = await Promise.all([projectsPromise, offersPromise]);

				const promises = filteredUsers.map((user) => {
					return new Promise(async (resolve, reject) => {
						const userOffers = offers.filter((offer) => offer.user_id === user.id);
						const userOffersByMonth = this._getOffersByMonth(userOffers);
						const timeEntriesPromise = this._loadTimeEntriesNextYear(user.id);
						const userIssues = issues.filter(
							(item) =>
								item.assigned_to?._attributes.id === user.id &&
								item.status._attributes.id !== 4
						);
						const uniqueProjectsFromIssues = userIssues.filter(
							(item, index, self) =>
								index ===
								self.findIndex(
									(t) => t.project._attributes.id === item.project._attributes.id
								)
						);
						const userProjects = projects.filter(
							(project) =>
								project.user_id === user.id &&
								uniqueProjectsFromIssues
									.map((item) => item.project._attributes.id)
									.includes(project.project_id)
						);

						let [timeEntries] = await Promise.all([timeEntriesPromise]);

						const projectsTimeWorkedByMonthPlan =
							this._getProjectsTimeWorkedByMonthPlan(
								userIssues.filter(
									(item) =>
										item.project._attributes.id !== 417 &&
										item.status._attributes.id !== 4
								),
								timeEntries.filter((item) => item.project._attributes.id !== 417)
							);

						const projectsTimeWorkedCombined = projectsTimeWorkedByMonthPlan.map(
							(item) => {
								const planProject = userProjects.find(
									(plan) => plan.project_id === item.id
								);
								if (planProject) {
									return {
										id: planProject.project_id,
										name: item.name,
										...planProject,
									};
								}
								return {
									id: item.id,
									name: item.name,
									...this._fillMissingMonths({}),
								};
							}
						);

						const userRows = [
							{
								id: user.id,
								rowTitle: `${user.firstname} ${user.lastname}`,
								name: oBundle.getText("projectsCapital"),
							},
							...projectsTimeWorkedCombined.sort((a, b) =>
								a.name.localeCompare(b.name)
							),
						];

						const notEmptyOffers = userOffersByMonth.filter((item) => {
							for (let month of this._months) {
								if (item[month] > 0) return true;
							}

							return false;
						});

						if (notEmptyOffers.length) {
							userRows.push({
								name: oBundle.getText("offersTableTitle"),
							});

							userRows.push(
								...notEmptyOffers.sort((a, b) => a.name.localeCompare(b.name))
							);
						}

						resolve(userRows);
					});
				});

				const data = await Promise.all(promises);

				const columns = [
					{ label: oBundle.getText("month"), property: "rowTitle", width: 24 },
					{ label: " ", property: "name", width: 48 },
					...this._months.map((month) => {
						return {
							label: oBundle.getText(month),
							property: month,
							type: EdmType.Number,
							scale: 3,
							textAlign: "end",
							width: 14,
						};
					}),
				];

				sap.ui.core.BusyIndicator.hide();

				this._exportData(formatter.formatTextNextYear(oBundle.getText("projectAndOffersPlan")), columns, data.flat(1));
			},

			onSearch: function (oEvent) {
				const searchValue = oEvent.getParameter("newValue");
				const usersList = this.getView().byId("usersList");
				const aFilters = [];

				if (searchValue) {
					aFilters.push(
						new Filter(
							[
								new Filter("firstname", FilterOperator.StartsWith, searchValue),
								new Filter("lastname", FilterOperator.StartsWith, searchValue),
							],
							false
						)
					);
				}

				usersList.getBinding("items").filter(aFilters, "Application");
			},

			handleSortButtonPressed: async function () {
				const oViewSettingsDialog = await this._getViewSettingsDialog("SortDialog");
				this.getView().addDependent(oViewSettingsDialog);
				oViewSettingsDialog.open();
			},

			handleSortDialogConfirm: async function (oEvent) {
				const usersList = this.getView().byId("usersList");
				const sPath = oEvent.getParameters().sortItem.getKey();
				const bDescending = oEvent.getParameters().sortDescending;
				const aSorters = [];

				aSorters.push(new Sorter(sPath, bDescending));

				usersList.getBinding("items").sort(aSorters);
			},

			handleGroupButtonPressed: async function () {
				const oViewSettingsDialog = await this._getViewSettingsDialog("GroupDialog");
				this.getView().addDependent(oViewSettingsDialog);
				oViewSettingsDialog.open();
			},

			handleGroupDialogConfirm: function (oEvent) {
				const usersListBinding = this.getView().byId("usersList").getBinding("items");
				const mParams = oEvent.getParameters();
				const aGroups = [];
				let sKey, sPath, bDescending;

				if (mParams.groupItem) {
					sKey = mParams.groupItem.getKey();
					bDescending = mParams.groupDescending;

					if (sKey === "relationship") sPath = "custom_fields/custom_field/4/value";

					aGroups.push(
						new Sorter(sPath, bDescending, (oContext) => {
							const relationship = oContext.getProperty(sPath);
							return { key: relationship, text: relationship };
						})
					);
					// apply the selected group settings
				}
				usersListBinding.sort(aGroups);
			},

			_getViewSettingsDialog: async function (sDialogFragmentName) {
				let pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

				if (!pDialog) {
					pDialog = await Fragment.load({
						id: this.getView().getId(),
						name:
							"sap.ui.demo.basicTemplate.view.UtilizationFragments." +
							sDialogFragmentName,
						controller: this,
					});
					this._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
				}
				return pDialog;
			},

			onRefreshUsersPress: async function () {
				sap.ui.core.BusyIndicator.show();
				const users = await this._loadUsers();
				this.getView().getModel().setProperty("/users", users);
				sap.ui.core.BusyIndicator.hide();
			},

			onRefreshDetailPress: async function () {
				const user = this.getView().getModel("detail").getProperty("/user");
				await this._loadData();
				this._setDetailData(user);
			},

			onPressUsersItem: async function (oEvent) {
				const user = oEvent.getParameter("listItem").getBindingContext().getObject();
				this._setDetailData(user);
			},

			onEvalSubmit: function () {
				const planEval = this.getView().getModel("detail").getProperty("/planEval");
				const workingTime = planEval.find((item) => item.name === "workingTime");
				const year = new Date().getFullYear();

				this._saveWorkingTimeIntoDB(year, workingTime);
				this.onPlanValueSubmit();
			},

			onProjectsSubmit: function () {
				const year = new Date().getFullYear();

				this._saveProjectsIntoDB(year, "planProjects");
				this.onPlanValueSubmit();
			},

			onOffersSubmit: function () {
				const year = new Date().getFullYear();

				this._saveOffersIntoDB(year, "planOffers");
				this.onPlanValueSubmit();
			},

			onPresaleSubmit: function () {
				const year = new Date().getFullYear();

				this._saveCrmProjectIssuesIntoDB(year, "planPresale");
				this.onPlanValueSubmit();
			},

			onEvalNextSubmit: function () {
				const planEval = this.getView().getModel("detail").getProperty("/planEvalNextYear");
				const workingTime = planEval.find((item) => item.name === "workingTime");
				const year = new Date().getFullYear() + 1;

				this._saveWorkingTimeIntoDB(year, workingTime);
				this.onPlanValueNextYearSubmit();
			},

			onProjectsNextSubmit: function () {
				const year = new Date().getFullYear() + 1;

				this._saveProjectsIntoDB(year, "planProjectsNextYear");
				this.onPlanValueNextYearSubmit();
			},

			onOffersNextSubmit: function () {
				const year = new Date().getFullYear() + 1;

				this._saveOffersIntoDB(year, "planOffersNextYear");
				this.onPlanValueNextYearSubmit();
			},

			onPresaleNextSubmit: function () {
				const year = new Date().getFullYear() + 1;

				this._saveCrmProjectIssuesIntoDB(year, "planPresaleNextYear");
				this.onPlanValueNextYearSubmit();
			},

			onPlanValueSubmit: function () {
				const detailData = this.getView().getModel("detail").getData();
				const workingTimeFundByMonthPlan = detailData.planEval.find(
					(item) => item.name === "workingTimeFund"
				);
				const absenceByMonth = detailData.planEval.find((item) => item.name === "absence");
				const workingTime = detailData.planEval.find((item) => item.name === "workingTime");

				const availableCapacityByMonth = this._calculateAvailableCapacityByMonth({
					workingTimeFundByMonthPlan,
					absenceByMonth,
					workingTime,
				});

				const plannedProjectsByMonth = this._calculatePlannedByMonth(
					detailData.planProjects
				);
				const plannedOffersByMonth = this._calculatePlannedByMonth(detailData.planOffers);

				const freeCapacityByMonth = this._calculateFreeCapacityByMonth({
					availableCapacityByMonth,
					plannedByMonth: plannedProjectsByMonth,
				});

				this._setNewPlanData({
					absenceByMonth: null,
					workingTime,
					availableCapacityByMonth,
					plannedProjectsByMonth,
					plannedOffersByMonth,
					freeCapacityByMonth,
				});

				this._setRealityAndPlan();
			},

			onPlanValueNextYearSubmit: function () {
				const detailData = this.getView().getModel("detail").getData();
				const workingTimeFundByMonthPlan = detailData.planEvalNextYear.find(
					(item) => item.name === "workingTimeFund"
				);
				const absenceByMonth = detailData.planEvalNextYear.find(
					(item) => item.name === "absence"
				);
				const workingTime = detailData.planEvalNextYear.find(
					(item) => item.name === "workingTime"
				);

				const availableCapacityByMonth = this._calculateAvailableCapacityByMonth({
					workingTimeFundByMonthPlan,
					absenceByMonth,
					workingTime,
				});

				const plannedProjectsByMonth = this._calculatePlannedByMonth(
					detailData.planProjectsNextYear
				);
				const plannedOffersByMonth = this._calculatePlannedByMonth(
					detailData.planOffersNextYear
				);

				const freeCapacityByMonth = this._calculateFreeCapacityByMonth({
					availableCapacityByMonth,
					plannedByMonth: plannedProjectsByMonth,
				});

				this._setNewPlanNextYearData({
					absenceByMonth: null,
					workingTime,
					availableCapacityByMonth,
					plannedProjectsByMonth,
					plannedOffersByMonth,
					freeCapacityByMonth,
				});
			},

			// onAddNewOpportunityPress: function () {
			// 	const detailModel = this.getView().getModel("detail");

			// 	detailModel.setProperty("/planOpportunities", [
			// 		...detailModel.getProperty("/planOpportunities"),
			// 		{ name: "", ...this._fillMissingMonths({}) },
			// 	]);
			// },

			// onToggleRemovePress: function (oEvent) {
			// 	const table = this.getView().byId("tablePlanOpportunities");
			// 	const pressed = oEvent.getSource().getPressed();
			// 	if (pressed) {
			// 		table.setMode("Delete");
			// 	} else {
			// 		table.setMode("None");
			// 	}
			// },

			// onDeleteRowPress: async function (oEvent) {
			// 	const oBundle = this.getView().getModel("i18n").getResourceBundle();
			// 	const detailModel = this.getView().getModel("detail");
			// 	const opportunities = detailModel.getProperty("/planOpportunities");
			// 	let removeFromModel = true;
			// 	const itemPath = oEvent
			// 		.getParameter("listItem")
			// 		.getBindingContext("detail")
			// 		.getPath();
			// 	const itemToRemove = detailModel.getProperty(itemPath);

			// 	if (itemToRemove.opportunity_id) {
			// 		removeFromModel = await this._deleteOpportunityFromDB(
			// 			itemToRemove.opportunity_id
			// 		);
			// 	}

			// 	if (removeFromModel) {
			// 		const index = opportunities.indexOf(itemToRemove);
			// 		opportunities.splice(index, 1);

			// 		detailModel.setProperty("/planOpportunities", [...opportunities]);
			// 		this.onPlanValueSubmit();
			// 		MessageToast.show(oBundle.getText("successDeletingOpportunity"));
			// 	} else {
			// 		MessageToast.show(oBundle.getText("errorDeletingOpportunity"));
			// 	}
			// },

			// onSaveOpportunities: async function () {
			// 	const detailModel = this.getView().getModel("detail");
			// 	const opportunities = await this._saveOpprotunitiesIntoDB();
			// 	detailModel.setProperty("/planOpportunities", opportunities);
			// },

			_setDetailData: async function (user) {
				sap.ui.core.BusyIndicator.show();

				const detailModel = this.getView().getModel("detail");
				const detailData = detailModel.getData();
				const masterModel = this.getView().getModel();
				const masterData = masterModel.getData();
				const currentYear = new Date().getFullYear();

				detailModel.setProperty("/user", user);

				// const userMemberships = user.memberships.membership;
				// let userProjectsIds = [];
				// if (userMemberships) {
				// 	if (Array.isArray(userMemberships)) {
				// 		userProjectsIds = userMemberships.map(
				// 			(item) => item.project._attributes.id
				// 		);
				// 	} else {
				// 		userProjectsIds.push(userMemberships.id);
				// 	}
				// }
				// const userProjectsIds = [
				// 	...new Set(
				// 		masterData.issues
				// 			.filter(
				// 				(item) =>
				// 					item?.assigned_to && item.assigned_to._attributes.id === user.id
				// 			)
				// 			.map((item) => item.project._attributes.id)
				// 	),
				// ];

				const userIssues = masterData.issues.filter(
					(item) => item.assigned_to?._attributes.id === user.id
				);

				// const userNotClosedIssues = userIssues.filter(
				// 	(item) => item.status._attributes.id !== 4
				// );

				// const issuesInProjects = userIssues.reduce((prev,curr)=>{
				// 	const project = prev.find(item=>item.project._attributes.id === curr.project._attributes.id);

				// 	if(project){

				// 	}
				// },[])

				const uniqueProjectsFromIssues = userIssues.filter(
					(item, index, self) =>
						index ===
						self.findIndex(
							(t) => t.project._attributes.id === item.project._attributes.id
						)
				);

				const crmIssues = masterData.crmIssues;
				const crmIssuesNextYear = masterData.crmIssuesNextYear;
				const crmIssuesPrev = masterData.crmIssuesPrev;

				// const projects = masterData.projects;

				// const userProjects = projects.filter((project) =>
				// 	userProjectsIds.includes(project.id)
				// );

				const attendancePromise = this._loadAttendance(user.id);
				const timeEntriesPromise = this._loadTimeEntries(user.id);
				const timeEntriesNextYearPromise = this._loadTimeEntriesNextYear(user.id);
				const timeEntriesPrevPromise = this._loadTimeEntriesPrev(user.id);
				const planProjectsPromise = this._loadProjectsFromDB(
					user.id,
					uniqueProjectsFromIssues.map((item) => item.project._attributes.id)
				);
				const planProjectsNextYearPromise = this._loadProjectsNextYearFromDB(
					user.id,
					uniqueProjectsFromIssues.map((item) => item.project._attributes.id)
				);
				const planProjectsPrevPromise = this._loadProjectsPrevFromDB(
					user.id,
					uniqueProjectsFromIssues.map((item) => item.project._attributes.id)
				);
				const crmProjectIssuesPromise = this._loadCrmProjectIssuesFromDB(
					user.id,
					crmIssues.map((issue) => issue.id)
				);
				const crmProjectIssuesNextYearPromise = this._loadCrmProjectIssuesNextYearFromDB(
					user.id,
					crmIssuesNextYear.map((issue) => issue.id)
				);
				const crmProjectIssuesPrevPromise = this._loadCrmProjectIssuesPrevFromDB(
					user.id,
					crmIssuesPrev.map((issue) => issue.id)
				);
				// const opportunitiesPromise = this._loadOpportunitiesFromDB(user.id);
				const offersPromise = this._loadOffersFromDB(user.id);
				const offersNextYearPromise = this._loadOffersNextYearFromDB(user.id);
				const workingTimePromise = this._loadWorkingTimeFromDB(user.id, currentYear);
				const workingTimeNextYearPromise = this._loadWorkingTimeFromDB(
					user.id,
					currentYear + 1
				);

				const [
					attendance,
					timeEntries,
					timeEntriesNextYear,
					timeEntriesPrev,
					planProjects,
					planProjectsNextYear,
					planProjectsPrev,
					crmProjectIssues,
					crmProjectIssuesNextYear,
					crmProjectIssuesPrev,
					offers,
					offersNextYear,
					workingTime,
					workingTimeNextYear,
					/*, opportunities*/
				] = await Promise.all([
					attendancePromise,
					timeEntriesPromise,
					timeEntriesNextYearPromise,
					timeEntriesPrevPromise,
					planProjectsPromise,
					planProjectsNextYearPromise,
					planProjectsPrevPromise,
					crmProjectIssuesPromise,
					crmProjectIssuesNextYearPromise,
					crmProjectIssuesPrevPromise,
					offersPromise,
					offersNextYearPromise,
					workingTimePromise,
					workingTimeNextYearPromise,
					/*opportunitiesPromise,*/
				]);

				// detailModel.setProperty("/planOpportunities", opportunities);
				const offersByMonth = this._getOffersByMonth(offers);
				detailModel.setProperty("/planOffers", offersByMonth);
				const offersByMonthNextYear = this._getOffersByMonth(offersNextYear);
				detailModel.setProperty("/planOffersNextYear", offersByMonthNextYear);

				const workingTimeFilled = this._fillWorkingTime(workingTime[0] ?? {});
				const workingTimeNextYearFilled = this._fillWorkingTime(
					workingTimeNextYear[0] ?? {}
				);

				const crmIssuesByMonth = this._calculateCrmIssuesByMonth(
					timeEntries,
					crmIssues.filter(
						(crmIssue) =>
							crmIssue.assigned_to?._attributes.id === user.id &&
							crmIssue.status._attributes.id !== 4
					)
				);
				const crmIssuesByMonthNextYear = this._calculateCrmIssuesByMonth(
					timeEntriesNextYear,
					crmIssuesNextYear.filter(
						(crmIssue) =>
							crmIssue.assigned_to?._attributes.id === user.id &&
							crmIssue.status._attributes.id !== 4
					)
				);
				const crmIssuesByMonthPrev = this._calculateCrmIssuesByMonth(
					timeEntriesPrev,
					crmIssuesPrev.filter(
						(crmIssue) =>
							crmIssue.assigned_to?._attributes.id === user.id &&
							crmIssue.status._attributes.id !== 4
					)
				);
				const workingTimeFundByMonthPlan = detailData.planEval.find(
					(item) => item.name === "workingTimeFund"
				);
				const workingTimeFundByMonthPlanNextYear = detailData.planEvalNextYear.find(
					(item) => item.name === "workingTimeFund"
				);
				// const workingTimeFundByMonthReal = detailData.realEval.find(
				// 	(item) => item.id === 1
				// );
				const absenceByMonth = this._calculateAbsenceByMonth(attendance);
				const absenceByMonthNextYear = this._calculateAbsenceByMonthNextYear(attendance);
				const timeWorkedByMonth = this._calculateTimeWorkedByMonth(timeEntries);
				const timeWorkedPrevByMonth = this._calculateTimeWorkedByMonth(timeEntriesPrev);
				//const utilizationByMonth = this._calculateUtilizationByMonth({ //
				// 	absenceByMonth, //
				// 	timeWorkedByMonth, //
				// 	workingTimeFundByMonthReal, //
				// }); //
				const availableCapacityByMonth = this._calculateAvailableCapacityByMonth({
					workingTimeFundByMonthPlan,
					absenceByMonth,
					workingTime: workingTimeFilled,
				});

				const availableCapacityByMonthNextYear = this._calculateAvailableCapacityByMonth({
					workingTimeFundByMonthPlan: workingTimeFundByMonthPlanNextYear,
					absenceByMonth: absenceByMonthNextYear,
					workingTime: workingTimeNextYearFilled,
				});

				const projectsTimeWorkedByMonthReal = this._getProjectsTimeWorkedByMonthReal(
					/*userIssues,
					uniqueProjectsFromIssues,*/
					timeEntries.filter((entry) => entry.project._attributes.id !== 437)
				);
				const projectsTimeWorkedByMonthRealPrev = this._getProjectsTimeWorkedByMonthReal(
					/*userIssues,
					uniqueProjectsFromIssues,*/
					timeEntriesPrev.filter((entry) => entry.project._attributes.id !== 437)
				);
				const projectsTimeWorkedByMonthPlan = this._getProjectsTimeWorkedByMonthPlan(
					userIssues.filter(
						(item) =>
							item.project._attributes.id !== 417 && item.status._attributes.id !== 4
					),
					timeEntries.filter((item) => item.project._attributes.id !== 417)
				);
				const projectsTimeWorkedByMonthPlanNextYear =
					this._getProjectsTimeWorkedByMonthPlan(
						userIssues.filter(
							(item) =>
								item.project._attributes.id !== 417 &&
								item.status._attributes.id !== 4
						),
						timeEntriesNextYear.filter((item) => item.project._attributes.id !== 417)
					);
				const projectsTimeWorkedByMonthPlanPrev = this._getProjectsTimeWorkedByMonthPlan(
					userIssues.filter(
						(item) =>
							item.project._attributes.id !== 417 && item.status._attributes.id !== 4
					),
					timeEntriesPrev.filter((item) => item.project._attributes.id !== 417)
				);
				// const projectsTimeWorkedByMonthPlan = this._getProjectsTimeWorkedByMonthPlan(
				// 	uniqueProjectsFromIssues.filter(
				// 		(item) =>
				// 			item.project._attributes.id !== 417 && item.status._attributes.id !== 4
				// 	),
				// 	timeEntries.filter((item) => item.project._attributes.id !== 417)
				// );

				const crmProjectIssuesCombined = crmIssuesByMonth.map((item) => {
					const crmIssue = crmProjectIssues.find((issue) => issue.issue_id === item.id);
					if (crmIssue) {
						return { id: crmIssue.issue_id, subject: item.subject, ...crmIssue };
					}
					return { id: item.id, subject: item.subject, ...this._fillMissingMonths({}) };
				});
				detailModel.setProperty("/planPresale", crmProjectIssuesCombined);
				const crmProjectIssuesCombinedNextYear = crmIssuesByMonthNextYear.map((item) => {
					const crmIssue = crmProjectIssuesNextYear.find(
						(issue) => issue.issue_id === item.id
					);
					if (crmIssue) {
						return { id: crmIssue.issue_id, subject: item.subject, ...crmIssue };
					}
					return { id: item.id, subject: item.subject, ...this._fillMissingMonths({}) };
				});
				detailModel.setProperty("/planPresaleNextYear", crmProjectIssuesCombinedNextYear);
				const crmProjectIssuesCombinedPrev = crmIssuesByMonthPrev.map((item) => {
					const crmIssue = crmProjectIssuesPrev.find(
						(issue) => issue.issue_id === item.id
					);
					if (crmIssue) {
						return { id: crmIssue.issue_id, subject: item.subject, ...crmIssue };
					}
					return { id: item.id, subject: item.subject, ...this._fillMissingMonths({}) };
				});
				detailModel.setProperty("/planPresalePrev", crmProjectIssuesCombinedPrev);

				const projectsTimeWorkedCombined = projectsTimeWorkedByMonthPlan.map((item) => {
					const planProject = planProjects.find((plan) => plan.project_id === item.id);
					if (planProject) {
						return { id: planProject.project_id, name: item.name, ...planProject };
					}
					return {
						id: item.id,
						name: item.name,
						...this._fillMissingMonths({}),
					};
				});
				const projectsTimeWorkedCombinedNextYear =
					projectsTimeWorkedByMonthPlanNextYear.map((item) => {
						const planProject = planProjectsNextYear.find(
							(plan) => plan.project_id === item.id
						);
						if (planProject) {
							return { id: planProject.project_id, name: item.name, ...planProject };
						}
						return {
							id: item.id,
							name: item.name,
							...this._fillMissingMonths({}),
						};
					});
				const projectsTimeWorkedCombinedPrev = projectsTimeWorkedByMonthPlanPrev.map(
					(item) => {
						const planProject = planProjectsPrev.find(
							(plan) => plan.project_id === item.id
						);
						if (planProject) {
							return { id: planProject.project_id, name: item.name, ...planProject };
						}
						return {
							id: item.id,
							name: item.name,
							...this._fillMissingMonths({}),
						};
					}
				);

				detailModel.setProperty("/realReal", projectsTimeWorkedByMonthReal);
				detailModel.setProperty("/realRealPrev", projectsTimeWorkedByMonthRealPrev);

				detailModel.setProperty(
					"/planProjects",
					projectsTimeWorkedCombined /*.filter((item) => {
						const project = projects.find((project) => project.id === item.id);

						if (!project) return false;

						return project.status === 1;
					})*/
				);
				detailModel.setProperty(
					"/planProjectsNextYear",
					projectsTimeWorkedCombinedNextYear
				);
				// detailModel.setProperty("/planAllProjects", projectsTimeWorkedCombined);
				detailModel.setProperty("/planProjectsPrev", projectsTimeWorkedCombinedPrev);

				this._setRealityAndPlan();
				this._setRealityAndPlanPrev();

				const realityAbsenceByMonth = this._calculateAbsenceByMonth(
					attendance.filter((item) => {
						const arrival = new Date(item.arrival);
						const today = new Date();
						today.setHours(23, 59, 59);

						return arrival < today;
					})
				);
				const realityAbsencePrevByMonth = this._calculateAbsencePrevByMonth(
					attendance.filter((item) => {
						const arrival = new Date(item.arrival);
						const arrivalYear = arrival.getFullYear();
						const prevYear = new Date().getFullYear() - 1;

						return arrivalYear === prevYear;
					})
				);
				const invoicedTimeByMonth = this._calculateInvoicedTimeByMonth({
					realityAbsenceByMonth,
					timeEntries,
				});
				const invoicedTimePrevByMonth = this._calculateInvoicedTimePrevByMonth({
					realityAbsenceByMonth: realityAbsencePrevByMonth,
					timeEntries: timeEntriesPrev,
				});

				// const theoreticalAvailableCapacityByMonth =
				// 	this._calculateTheoreticalAvailableCapacityByMonth({
				// 		workingTimeFundByMonthPlan,
				// 		projects: detailData.planProjects,
				// 		crm: detailData.planPresale,
				// 		opportunities: detailData.planOpportunities,
				// 	});
				const plannedProjectsByMonth = this._calculatePlannedByMonth(
					detailData.planProjects
				);
				const plannedOffersByMonth = this._calculatePlannedByMonth(detailData.planOffers);
				const plannedProjectsByMonthNextYear = this._calculatePlannedByMonth(
					detailData.planProjectsNextYear
				);
				const plannedOffersByMonthNextYear = this._calculatePlannedByMonth(
					detailData.planOffersNextYear
				);

				const freeCapacityByMonth = this._calculateFreeCapacityByMonth({
					availableCapacityByMonth,
					plannedByMonth: plannedProjectsByMonth,
				});
				const freeCapacityByMonthNextYear = this._calculateFreeCapacityByMonth({
					availableCapacityByMonth: availableCapacityByMonthNextYear,
					plannedByMonth: plannedProjectsByMonthNextYear,
				});

				this._setNewPlanData({
					absenceByMonth,
					workingTime: workingTimeFilled,
					availableCapacityByMonth,
					plannedProjectsByMonth,
					plannedOffersByMonth,
					freeCapacityByMonth,
				});
				this._setNewRealityData({
					realityAbsenceByMonth,
					timeWorkedByMonth,
				  //  utilizationByMonth, //
					invoicedTimeByMonth,
				});
				this._setNewRealityPrevData({
					realityAbsencePrevByMonth,
					timeWorkedPrevByMonth,
					invoicedTimePrevByMonth,
				});
				this._setNewPlanNextYearData({
					absenceByMonth: absenceByMonthNextYear,
					workingTime: workingTimeNextYearFilled,
					availableCapacityByMonth: availableCapacityByMonthNextYear,
					plannedProjectsByMonth: plannedProjectsByMonthNextYear,
					plannedOffersByMonth: plannedOffersByMonthNextYear,
					freeCapacityByMonth: freeCapacityByMonthNextYear,
				});

				sap.ui.core.BusyIndicator.hide();
			},

			_setRealityAndPlan: function () {
				const reality = this.getView().getModel("detail").getProperty("/realReal");
				const planProjects = this.getView().getModel("detail").getProperty("/planProjects");
				const planPresale = this.getView().getModel("detail").getProperty("/planPresale");
				// const crmProject = crmIssues
				const allProjects = [
					...planProjects,
					{
						id: 417,
						...this._fillMissingMonths(
							planPresale.reduce((prev, curr) => {
								for (let key of Object.keys(curr)) {
									if (key !== "id" && key !== "subject") {
										if (key in prev) {
											prev[key] += Number(curr[key]);
										} else {
											prev[key] = Number(curr[key]);
										}
									}
								}
								return prev;
							}, {})
						),
					},
				];

				const realityAndPlan = reality
					.filter((item) => item.id !== 427)
					.map((item) => {
						const data = { id: item.id, name: item.name };
						this._months.forEach((month) => {
							const planProject = allProjects.find(
								(project) => project.id === item.id
							);

							data[month] = `${formatter.roundTo3Decimals(item[month])}/${
								planProject ? formatter.roundTo3Decimals(planProject[month]) : 0
							}`;
						});
						return data;
					});

				this.getView().getModel("detail").setProperty("/realRealPlan", realityAndPlan);
			},

			_setRealityAndPlanPrev: function () {
				const reality = this.getView().getModel("detail").getProperty("/realRealPrev");
				const planProjects = this.getView()
					.getModel("detail")
					.getProperty("/planProjectsPrev");
				const planPresale = this.getView()
					.getModel("detail")
					.getProperty("/planPresalePrev");
				// const crmProject = crmIssues
				const allProjects = [
					...planProjects,
					{
						id: 417,
						...this._fillMissingMonths(
							planPresale.reduce((prev, curr) => {
								for (let key of Object.keys(curr)) {
									if (key !== "id" && key !== "subject") {
										if (key in prev) {
											prev[key] += Number(curr[key]);
										} else {
											prev[key] = Number(curr[key]);
										}
									}
								}
								return prev;
							}, {})
						),
					},
				];

				const realityAndPlan = reality
					.filter((item) => item.id !== 427)
					.map((item) => {
						const data = { id: item.id, name: item.name };
						this._months.forEach((month) => {
							const planProject = allProjects.find(
								(project) => project.id === item.id
							);

							data[month] = `${formatter.roundTo3Decimals(item[month])}/${
								planProject ? formatter.roundTo3Decimals(planProject[month]) : 0
							}`;
						});
						return data;
					});

				this.getView().getModel("detail").setProperty("/realRealPlanPrev", realityAndPlan);
			},

			_setNewRealityData: function ({
				realityAbsenceByMonth,
				timeWorkedByMonth,
			//	utilizationByMonth, //
				invoicedTimeByMonth,
			}) {
				const detailModel = this.getView().getModel("detail");
				const detailData = detailModel.getData();
				const newRealityData = detailData.realEval.map((item) => {
					switch (item.id) {
						case 1:
							return item;
						case 2:
							return { ...item, ...realityAbsenceByMonth };
						case 3:
							return { ...item, ...timeWorkedByMonth };
					//	 case 4: //
					//	 	return { ...item, ...utilizationByMonth }; //
						case 5:
							return { ...item, ...invoicedTimeByMonth };
					}
				});
				detailModel.setProperty("/realEval", newRealityData);
			},

			_setNewRealityPrevData: function ({
				realityAbsencePrevByMonth,
				timeWorkedPrevByMonth,
				invoicedTimePrevByMonth,
			}) {
				const detailModel = this.getView().getModel("detail");
				const detailData = detailModel.getData();
				const newRealityData = detailData.realEvalPrev.map((item) => {
					switch (item.name) {
						case "workingTimeFund":
							return item;
						case "absence":
							return { ...item, ...realityAbsencePrevByMonth };
						case "workingTime":
							return { ...item, ...timeWorkedPrevByMonth };
						case "invoicedTime":
							return { ...item, ...invoicedTimePrevByMonth };
					}
				});
				detailModel.setProperty("/realEvalPrev", newRealityData);
			},

			_setNewPlanData: function ({
				absenceByMonth,
				workingTime,
				availableCapacityByMonth,
				plannedProjectsByMonth,
				plannedOffersByMonth,
				freeCapacityByMonth,
			}) {
				const detailModel = this.getView().getModel("detail");
				const detailData = detailModel.getData();
				const newPlanData = detailData.planEval.map((item) => {
					switch (item.name) {
						case "workingTimeFund":
							return item;
						case "absence":
							return { ...item, ...absenceByMonth };
						case "workingTime":
							return { ...item, ...workingTime };
						case "availableCapacity":
							return { ...item, ...availableCapacityByMonth };
						case "plannedProjects":
							return { ...item, ...plannedProjectsByMonth };
						case "plannedOffers":
							return { ...item, ...plannedOffersByMonth };
						case "freeCapacity":
							return { ...item, ...freeCapacityByMonth };
					}
				});
				detailModel.setProperty("/planEval", newPlanData);
			},

			_setNewPlanNextYearData: function ({
				absenceByMonth,
				workingTime,
				availableCapacityByMonth,
				plannedProjectsByMonth,
				plannedOffersByMonth,
				freeCapacityByMonth,
			}) {
				const detailModel = this.getView().getModel("detail");
				const detailData = detailModel.getData();
				const newPlanData = detailData.planEvalNextYear.map((item) => {
					switch (item.name) {
						case "workingTimeFund":
							return item;
						case "absence":
							return { ...item, ...absenceByMonth };
						case "workingTime":
							return { ...item, ...workingTime };
						case "availableCapacity":
							return { ...item, ...availableCapacityByMonth };
						case "plannedProjects":
							return { ...item, ...plannedProjectsByMonth };
						case "plannedOffers":
							return { ...item, ...plannedOffersByMonth };
						case "freeCapacity":
							return { ...item, ...freeCapacityByMonth };
					}
				});
				detailModel.setProperty("/planEvalNextYear", newPlanData);
			},

			_calculateAvailableCapacityByMonth: function ({
				workingTimeFundByMonthPlan,
				absenceByMonth,
				workingTime,
			}) {
				const availableCapacityByMonth = {};

				this._months.forEach((month) => {
					if (!(month in absenceByMonth)) {
						availableCapacityByMonth[month] =
							(workingTimeFundByMonthPlan[month] * workingTime[month]) / 100;
						return;
					}
					availableCapacityByMonth[month] =
						((workingTimeFundByMonthPlan[month] - absenceByMonth[month]) *
							workingTime[month]) /
						100;
				});

				return availableCapacityByMonth;
			},

			// _calculateTheoreticalAvailableCapacityByMonth: function ({
			// 	workingTimeFundByMonthPlan,
			// 	projects,
			// 	crm,
			// 	opportunities,
			// }) {
			// 	const theoreticalAvailableCapacityByMonth = {};

			// 	this._months.forEach((month) => {
			// 		const projectsSum = projects.reduce(
			// 			(prev, curr) => prev + Number(curr[month]),
			// 			0
			// 		);
			// 		const crmSum = crm.reduce((prev, curr) => prev + Number(curr[month]), 0);
			// 		const opportunitiesSum = opportunities.reduce(
			// 			(prev, curr) => prev + Number(curr[month]),
			// 			0
			// 		);

			// 		theoreticalAvailableCapacityByMonth[month] =
			// 			workingTimeFundByMonthPlan[month] - projectsSum - crmSum - opportunitiesSum;
			// 	});

			// 	return theoreticalAvailableCapacityByMonth;
			// },

			// _calculatePlannedByMonth: function ({ projects, crm, offers /*opportunities*/ }) {
			// 	const plannedByMonth = {};

			// 	this._months.forEach((month) => {
			// 		const projectsSum = projects.reduce(
			// 			(prev, curr) => prev + Number(curr[month]),
			// 			0
			// 		);
			// 		const crmSum = crm.reduce((prev, curr) => prev + Number(curr[month]), 0);
			// 		const offersSum = offers.reduce((prev, curr) => prev + Number(curr[month]), 0);
			// 		/*const opportunitiesSum = opportunities.reduce(
			// 			(prev, curr) => prev + Number(curr[month]),
			// 			0
			// 		);*/
			// 		plannedByMonth[month] = projectsSum + crmSum + offersSum;
			// 	});

			// 	return plannedByMonth;
			// },

			_calculatePlannedByMonth: function (records) {
				const plannedByMonth = {};

				this._months.forEach((month) => {
					plannedByMonth[month] = records.reduce(
						(prev, curr) => prev + Number(curr[month]),
						0
					);
				});

				return plannedByMonth;
			},

			_calculateFreeCapacityByMonth: function ({ availableCapacityByMonth, plannedByMonth }) {
				const freeCapacityByMonth = {};

				this._months.forEach((month) => {
					freeCapacityByMonth[month] =
						availableCapacityByMonth[month] - plannedByMonth[month];		
					 if (freeCapacityByMonth[month] < 0) {
    					//freeCapacityByMonth[month](sap.ui.core.ValueState.Error);
					//	this.setValueState(sap.ui.core.ValueState.Error);
					//this.addStyleClass("red");
					//this.byId("JanuaryInputID").getBinding("text").setFormatter(function(part){});
					};			
				});
				return freeCapacityByMonth;
			},

			_calculateWorikngTimeFundByMonth: function (workingTimeFund) {
				const timeWorkedByMonth = workingTimeFund.reduce((prev, curr) => {
					const MD = curr.hours / 8 ?? 0;
					const currentYear = new Date().getFullYear();
					const arrivalDate = new Date(curr.arrival);
					const arrivalYear = arrivalDate.getFullYear();
					const arrivalMonth = arrivalDate.getMonth();

					if (arrivalYear !== currentYear) return prev;

					if (prev[this._months[arrivalMonth]]) {
						prev[this._months[arrivalMonth]] += MD;
					} else {
						prev[this._months[arrivalMonth]] = MD;
					}

					return prev;
				}, []);

				return this._fillMissingMonths(timeWorkedByMonth);
			},

			_calculateWorikngTimeFundPrevByMonth: function (workingTimeFund) {
				const timeWorkedByMonth = workingTimeFund.reduce((prev, curr) => {
					const MD = curr.hours / 8 ?? 0;
					const prevYear = new Date().getFullYear() - 1;
					const arrivalDate = new Date(curr.arrival);
					const arrivalYear = arrivalDate.getFullYear();
					const arrivalMonth = arrivalDate.getMonth();

					if (arrivalYear !== prevYear) return prev;

					if (prev[this._months[arrivalMonth]]) {
						prev[this._months[arrivalMonth]] += MD;
					} else {
						prev[this._months[arrivalMonth]] = MD;
					}

					return prev;
				}, []);

				return this._fillMissingMonths(timeWorkedByMonth);
			},

			_calculateWorikngTimeFundByMonthNextYear: function (workingTimeFund) {
				const timeWorkedByMonth = workingTimeFund.reduce((prev, curr) => {
					const MD = curr.hours / 8 ?? 0;
					const nextYear = new Date().getFullYear() + 1;
					const arrivalDate = new Date(curr.arrival);
					const arrivalYear = arrivalDate.getFullYear();
					const arrivalMonth = arrivalDate.getMonth();

					if (arrivalYear !== nextYear) return prev;

					if (prev[this._months[arrivalMonth]]) {
						prev[this._months[arrivalMonth]] += MD;
					} else {
						prev[this._months[arrivalMonth]] = MD;
					}

					return prev;
				}, []);

				return this._fillMissingMonths(timeWorkedByMonth);
			},

			_calculateAbsenceByMonth: function (attendance) {
				const absenceNames = [
					"Dovolená",
					"Dovolená bonus",
					"Náhradní volno",
					"Placené volno (odběr krve, plazmy)",
					"Lékař",
					"Nemoc",
					"Neplacené volno",
					"Překážka na straně zaměstnance",
				];
				const absenceByMonth = attendance.reduce((prev, curr) => {
					const activity = curr.easy_attendance_activity;

					if (!absenceNames.includes(activity.name)) return prev;

					const currentYear = new Date().getFullYear();
					const arrivalDate = new Date(curr.arrival);
					const arrivalYear = arrivalDate.getFullYear();
					const arrivalMonth = arrivalDate.getMonth();

					if (arrivalYear !== currentYear) return prev;

					const MD = curr.hours / 8 ?? 0;

					if (prev[this._months[arrivalMonth]]) {
						prev[this._months[arrivalMonth]] += MD;
					} else {
						prev[this._months[arrivalMonth]] = MD;
					}

					return prev;
				}, []);

				return this._fillMissingMonths(absenceByMonth);
			},

			_calculateAbsencePrevByMonth: function (attendance) {
				const absenceNames = [
					"Dovolená",
					"Dovolená bonus",
					"Náhradní volno",
					"Placené volno (odběr krve, plazmy)",
					"Lékař",
					"Nemoc",
					"Neplacené volno",
					"Překážka na straně zaměstnance",
				];
				const absenceByMonth = attendance.reduce((prev, curr) => {
					const activity = curr.easy_attendance_activity;

					if (!absenceNames.includes(activity.name)) return prev;

					const prevYear = new Date().getFullYear() - 1;
					const arrivalDate = new Date(curr.arrival);
					const arrivalYear = arrivalDate.getFullYear();
					const arrivalMonth = arrivalDate.getMonth();

					if (arrivalYear !== prevYear) return prev;

					const MD = curr.hours / 8 ?? 0;

					if (prev[this._months[arrivalMonth]]) {
						prev[this._months[arrivalMonth]] += MD;
					} else {
						prev[this._months[arrivalMonth]] = MD;
					}

					return prev;
				}, []);

				return this._fillMissingMonths(absenceByMonth);
			},

			_calculateAbsenceByMonthNextYear: function (attendance) {
				const absenceNames = [
					"Dovolená",
					"Dovolená bonus",
					"Náhradní volno",
					"Placené volno (odběr krve, plazmy)",
					"Lékař",
					"Nemoc",
					"Neplacené volno",
					"Překážka na straně zaměstnance",
				];
				const absenceByMonth = attendance.reduce((prev, curr) => {
					const activity = curr.easy_attendance_activity;

					if (!absenceNames.includes(activity.name)) return prev;

					const nextYear = new Date().getFullYear() + 1;
					const arrivalDate = new Date(curr.arrival);
					const arrivalYear = arrivalDate.getFullYear();
					const arrivalMonth = arrivalDate.getMonth();

					if (arrivalYear !== nextYear) return prev;

					const MD = curr.hours / 8 ?? 0;

					if (prev[this._months[arrivalMonth]]) {
						prev[this._months[arrivalMonth]] += MD;
					} else {
						prev[this._months[arrivalMonth]] = MD;
					}

					return prev;
				}, []);

				return this._fillMissingMonths(absenceByMonth);
			},

			_calculateTimeWorkedByMonth: function (timeEntries) {
				const timeWorkedByMonth = timeEntries.reduce((prev, curr) => {
					const MD = curr.hours / 8 ?? 0;
					const spentOn = new Date(curr.spent_on);
					const spentOnMonth = spentOn.getMonth();
					const today = new Date();
					today.setHours(23, 59, 59);

					const entryProjectId = curr.project._attributes.id;

					if (spentOn > today) return prev;
					if (entryProjectId === 427 || entryProjectId === 524) return prev;

					prev[this._months[spentOnMonth]] += MD;

					return prev;
				}, this._fillMissingMonths({}));

				return timeWorkedByMonth;
			},

			// _calculateUtilizationByMonth: function ({ //
			// 	workingTimeFundByMonthReal, //
			// 	timeWorkedByMonth, //
			// 	absenceByMonth, //
			// }) { //
			 //	const utilizationByMonth = {}; //

			 //	this._months.forEach((month) => { //
			 //		const timeWorked = timeWorkedByMonth[month] ?? 0; //
			 //		const workingTimeFund = workingTimeFundByMonthReal[month] ?? 0; //
			 //		const absence = absenceByMonth[month] ?? 0; //

			 //		utilizationByMonth[month] = formatter.formatPercent( //
			 //			(timeWorked / (workingTimeFund - absence)) * 100 //
			 //		); //
			 //	}); //

			 //	return utilizationByMonth; //
			 //}, //

			_calculateInvoicedTimeByMonth: function ({ realityAbsenceByMonth, timeEntries }) {
				const realEval = this.getView().getModel("detail").getProperty("/realEval");

				const today = new Date();
				today.setHours(23, 59, 59);

				const invoicedTimeByMonth = {};
				const projectsToFilter = [427, 706, 705, 417, 524, 665];

				this._months.forEach((month) => {
					const billed = timeEntries
						.filter((entry) => {
							const spentOnDate = new Date(entry.spent_on);
							const spentOnMonth = spentOnDate.getMonth();
							const entryProjectId = entry.project._attributes.id;

							return (
								spentOnDate <= today &&
								this._months[spentOnMonth] === month &&
								entry.easy_is_billable === true &&
								!projectsToFilter.includes(entryProjectId)
							);
						})
						.reduce((prev, curr) => prev + curr.hours / 8, 0);

					const fund = Number(realEval.find((item) => item.id === 1)[month]);
					const absence = Number(realityAbsenceByMonth[month]);

					const value = (billed / (fund - absence)) * 100;

					invoicedTimeByMonth[month] = formatter.formatPercent(value);
				});

				return invoicedTimeByMonth;
			},

			_calculateInvoicedTimePrevByMonth: function ({ realityAbsenceByMonth, timeEntries }) {
				const realEval = this.getView().getModel("detail").getProperty("/realEvalPrev");

				const lastYear = new Date().getFullYear() - 1;

				const invoicedTimeByMonth = {};
				const projectsToFilter = [427, 706, 705, 417, 524, 665];

				this._months.forEach((month) => {
					const billed = timeEntries
						.filter((entry) => {
							const spentOnDate = new Date(entry.spent_on);
							const spentOnYear = spentOnDate.getFullYear();
							const spentOnMonth = spentOnDate.getMonth();
							const entryProjectId = entry.project._attributes.id;

							return (
								spentOnYear === lastYear &&
								this._months[spentOnMonth] === month &&
								entry.easy_is_billable === true &&
								!projectsToFilter.includes(entryProjectId)
							);
						})
						.reduce((prev, curr) => prev + curr.hours / 8, 0);

					const fund = Number(
						realEval.find((item) => item.name === "workingTimeFund")[month]
					);
					const absence = Number(realityAbsenceByMonth[month]);

					const value = (billed / (fund - absence)) * 100;

					invoicedTimeByMonth[month] = formatter.formatPercent(value);
				});

				return invoicedTimeByMonth;
			},

			_getProjectsTimeWorkedByMonthPlan: function (userIssues, timeEntries) {
				// const masterData = this.getView().getModel().getData();
				const timeWorkedByMonth = userIssues.reduce((prevIssues, currIssue) => {
					const entries = timeEntries.filter(
						(entry) => entry?.issue?._attributes?.id === currIssue.id
					);

					let projectIndex = prevIssues.findIndex(
						(item) => item.id === currIssue?.project?._attributes?.id
					);

					if (projectIndex < 0) {
						projectIndex =
							prevIssues.push({
								id: currIssue.project._attributes.id,
								name: currIssue.project._attributes.name,
							}) - 1;
					}

					if (!entries.length) {
						prevIssues[projectIndex] = this._fillMissingMonths(
							prevIssues[projectIndex]
						);
					} else {
						entries.forEach((entry) => {
							const MD = entry.hours / 8 ?? 0;
							const spentOnDate = new Date(entry.spent_on);
							const spentOnMonth = spentOnDate.getMonth();

							if (!(this._months[spentOnMonth] in prevIssues[projectIndex])) {
								prevIssues[projectIndex][this._months[spentOnMonth]] = MD;
							} else {
								prevIssues[projectIndex][this._months[spentOnMonth]] += MD;
							}
						});
					}

					return prevIssues;
				}, []);
				// let timeWorkedByMonth = timeEntries.reduce((prev, curr) => {
				// 	const MD = curr.hours / 8 ?? 0;

				// 	const spentOnDate = new Date(curr.spent_on);
				// 	const spentOnMonth = spentOnDate.getMonth();

				// 	const project = prev.find((item) => item.id === curr.project._attributes.id);

				// 	if (!project) {
				// 		prev.push({
				// 			id: curr.project._attributes.id,
				// 			name: curr.project._attributes.name,
				// 			[this._months[spentOnMonth]]: MD,
				// 		});
				// 	} else {
				// 		if (!(this._months[spentOnMonth] in project)) {
				// 			project[this._months[spentOnMonth]] = MD;
				// 		} else {
				// 			project[this._months[spentOnMonth]] += MD;
				// 		}
				// 	}

				// 	return prev;
				// }, []);

				// timeWorkedByMonth = timeWorkedByMonth.map((item) => this._fillMissingMonths(item));

				return timeWorkedByMonth;
			},

			_getProjectsTimeWorkedByMonthReal: function (
				/*userIssues, uniqueProjectsFromIssues,*/
				timeEntries
			) {
				// const uniqueIssueProjects = userIssues
				// 	.filter((item) => {
				// 		const closedOnYear = new Date(item.closed_on).getFullYear();
				// 		return !item.closed_on || closedOnYear === new Date().getFullYear();
				// 	})
				// 	.filter(
				// 		(item, index, self) =>
				// 			index ===
				// 			self.findIndex(
				// 				(t) => t.project._attributes.id === item.project._attributes.id
				// 			)
				// 	);
				// const timeWorkedByMonth = uniqueIssueProjects.map((projectIssue) => {
				// 	const entries = timeEntries.filter(
				// 		(entry) =>
				// 			entry.project._attributes.id === projectIssue.project._attributes.id
				// 	);

				// 	const timeByMonth = entries.reduce((prevEntry, currEntry) => {
				// 		const MD = currEntry.hours / 8 ?? 0;
				// 		const spentOnDate = new Date(currEntry.spent_on);
				// 		const spentOnMonth = spentOnDate.getMonth();

				// 		if (!(this._months[spentOnMonth] in prevEntry)) {
				// 			prevEntry[this._months[spentOnMonth]] = MD;
				// 		} else {
				// 			prevEntry[this._months[spentOnMonth]] += MD;
				// 		}

				// 		return prevEntry;
				// 	}, {});

				// 	return this._fillMissingMonths({
				// 		id: projectIssue.project._attributes.id,
				// 		name: projectIssue.project._attributes.name,
				// 		...timeByMonth,
				// 	});
				// });

				// const timeWorkedByMonth = uniqueProjectsFromIssues
				// 	.filter((item) => {
				// 		const closedOnYear = new Date(item.closed_on).getFullYear();
				// 		return !item.closed_on || closedOnYear === new Date().getFullYear();
				// 	})
				// 	.map((projectIssue) => {
				// 		const entries = timeEntries.filter(
				// 			(entry) =>
				// 				entry.project._attributes.id === projectIssue.project._attributes.id
				// 		);

				// 		const timeByMonth = entries.reduce((prevEntry, currEntry) => {
				// 			const MD = currEntry.hours / 8 ?? 0;
				// 			const spentOnDate = new Date(currEntry.spent_on);
				// 			const spentOnMonth = spentOnDate.getMonth();

				// 			if (!(this._months[spentOnMonth] in prevEntry)) {
				// 				prevEntry[this._months[spentOnMonth]] = MD;
				// 			} else {
				// 				prevEntry[this._months[spentOnMonth]] += MD;
				// 			}

				// 			return prevEntry;
				// 		}, {});

				// 		return this._fillMissingMonths({
				// 			id: projectIssue.project._attributes.id,
				// 			name: projectIssue.project._attributes.name,
				// 			...timeByMonth,
				// 		});
				// 	});

				let timeWorkedByMonth = timeEntries.reduce((prev, curr) => {
					const MD = curr.hours / 8 ?? 0;

					const spentOnDate = new Date(curr.spent_on);
					const spentOnMonth = spentOnDate.getMonth();

					const project = prev.find((item) => item.id === curr.project._attributes.id);

					if (!project) {
						prev.push({
							id: curr.project._attributes.id,
							name: curr.project._attributes.name,
							[this._months[spentOnMonth]]: MD,
						});
					} else {
						if (!(this._months[spentOnMonth] in project)) {
							project[this._months[spentOnMonth]] = MD;
						} else {
							project[this._months[spentOnMonth]] += MD;
						}
					}

					return prev;
				}, []);

				return timeWorkedByMonth;
			},

			_getOffersByMonth: function (offers) {
				const crmCases = this.getView().getModel().getProperty("/crmCases");

				let offersByMonth = crmCases.reduce((prev, curr) => {
					const offer = offers.find((item) => item.offer_id === curr.id);

					if (!offer) {
						prev.push({
							offer_id: curr.id,
							name: curr.name,
						});
					} else {
						prev.push({ name: curr.name, ...offer });
					}

					return prev;
				}, []);

				offersByMonth = offersByMonth.map((item) => this._fillMissingMonths(item));

				return offersByMonth;
			},

			_calculateCrmIssuesByMonth: function (timeEntries, issues) {
				const timeWorkedByMonth = issues.reduce((prev, curr) => {
					prev.push(
						this._fillMissingMonths({
							id: curr.id,
							subject: curr.subject,
						})
					);
					timeEntries.forEach((entry) => {
						if (entry?.issue?._attributes?.id !== curr.id) return;

						const issue = prev.find((item) => item.id === entry.issue._attributes.id);

						const spentOnMonth = new Date(entry.spent_on).getMonth();

						const MD = entry.hours / 8 ?? 0;

						issue[this._months[spentOnMonth]] += MD;
					});
					return prev;
				}, []);
				return timeWorkedByMonth;
			},

			_fillMissingMonths: function (data) {
				this._months.forEach((item) => {
					if (!(item in data)) data[item] = 0;
				});
				return data;
			},

			_fillWorkingTime: function (data) {
				this._months.forEach((item) => {
					if (!(item in data)) data[item] = 100;
				});
				return data;
			},

			onPlanExportPress: function () {
				const EdmType = exportLibrary.EdmType;
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const user = this.getView().getModel("detail").getProperty("/user");
				const planEval = this.getView().getModel("detail").getProperty("/planEval");
				const planProjects = this.getView().getModel("detail").getProperty("/planProjects");
				const planPresale = this.getView().getModel("detail").getProperty("/planPresale");
				const planOffers = this.getView().getModel("detail").getProperty("/planOffers");
				// const planOpportunities = this.getView()
				// 	.getModel("detail")
				// 	.getProperty("/planOpportunities");
				const data = [...planEval];

				if (planProjects.length) {
					data.push(
						{},
						{ rowTitle: oBundle.getText("projectsTableTitle") },
						{},
						...planProjects.map((plan) => {
							return { rowTitle: plan.name, ...plan };
						})
					);
				}

				if (planOffers.length) {
					data.push(
						{},
						{ rowTitle: oBundle.getText("offersTableTitle") },
						{},
						...planOffers.map((plan) => {
							return { rowTitle: plan.name, ...plan };
						})
					);
				}

				if (planPresale.length) {
					data.push(
						{},
						{ rowTitle: oBundle.getText("presaleTableTitle") },
						{},
						...planPresale.map((plan) => {
							return { rowTitle: plan.subject, ...plan };
						})
					);
				}

				// if (planOpportunities.length) {
				// 	data.push(
				// 		{},
				// 		{ rowTitle: oBundle.getText("opportunitiesTableTitle") },
				// 		{},
				// 		...planOpportunities.map((plan) => {
				// 			return { rowTitle: plan.name, ...plan };
				// 		})
				// 	);
				// }

				const columns = [
					{ label: oBundle.getText("month"), property: "rowTitle", width: 36 },
					...this._months.map((month) => {
						return {
							label: oBundle.getText(month),
							property: month,
							type: EdmType.Number,
						};
					}),
				];

				this._exportData(`${user.firstname}_${user.lastname}_plan`, columns, data);
			},

			onRealityExportPress: function () {
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const user = this.getView().getModel("detail").getProperty("/user");
				const realEval = this.getView().getModel("detail").getProperty("/realEval");
				const realRealPlan = this.getView().getModel("detail").getProperty("/realRealPlan");
				const realReal = realRealPlan.map((item) => {
					const obj = { id: item.id, rowTitle: item.name };
					this._months.forEach(
						(month) => (obj[month] = Number(item[month].split("/")[0]))
					);
					return obj;
				});
				const workedTime = realEval.find((item) => item.id === 3);
				const projectsParticipation = realReal.map((item) => {
					const obj = { id: item.id, rowTitle: item.rowTitle };
					this._months.forEach(
						(month) =>
							(obj[month] = formatter
								.formatPercent((item[month] / workedTime[month]) * 100)
								.replace(".", ","))
					);
					return obj;
				});
				const data = [
					...realEval.map((item1) => {
						const formattedItem = { ...item1, id:"" };

						this._months.forEach((month) => {
							formattedItem[month] = String(item1[month]).replace(".", ",");
						});

						return formattedItem;
					}),
					{},
					{ rowTitle: oBundle.getText("realityPlanTableTitle").split("/")[0] },
					{},
					...realReal.map((item1) => {
						const formattedItem = { ...item1 };

						this._months.forEach((month) => {
							formattedItem[month] = String(item1[month]).replace(".", ",");
						});

						return formattedItem;
					}),
					{},
					{ rowTitle: oBundle.getText("projectsParticipation") },
					{},
					...projectsParticipation,
				];

				const columns = [
					{ label: oBundle.getText("month"), property: "rowTitle", width: 36 },
					{ label: oBundle.getText("projectID"), property: "id", width: 36 },
					...this._months.map((month) => {
						return {
							label: oBundle.getText(month),
							property: month,
						};
					}),
				];

				this._exportData(`${user.firstname}_${user.lastname}_skutecnost`, columns, data);
			},

			onRealityPrevExportPress: function () {
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const user = this.getView().getModel("detail").getProperty("/user");
				const realEval = this.getView().getModel("detail").getProperty("/realEvalPrev");
				const realRealPlan = this.getView()
					.getModel("detail")
					.getProperty("/realRealPlanPrev");
				const realReal = realRealPlan.map((item) => {
					const obj = { id: item.id, rowTitle: item.name };
					this._months.forEach(
						(month) => (obj[month] = Number(item[month].split("/")[0]))
					);
					return obj;
				});
				const workedTime = realEval.find((item) => item.name === "workingTime");
				const projectsParticipation = realReal.map((item) => {
					const obj = { id: item.id, rowTitle: item.rowTitle };
					this._months.forEach(
						(month) =>
							(obj[month] = formatter
								.formatPercent((item[month] / workedTime[month]) * 100)
								.replace(".", ","))
					);
					return obj;
				});
				const data = [
					...realEval.map((item1) => {
						const formattedItem = { ...item1 };

						this._months.forEach((month) => {
							formattedItem[month] = String(item1[month]).replace(".", ",");
						});

						return formattedItem;
					}),
					{},
					{ rowTitle: oBundle.getText("realityPlanTableTitle").split("/")[0] },
					{},
					...realReal.map((item1) => {
						const formattedItem = { ...item1 };

						this._months.forEach((month) => {
							formattedItem[month] = String(item1[month]).replace(".", ",");
						});

						return formattedItem;
					}),
					{},
					{ rowTitle: oBundle.getText("projectsParticipation") },
					{},
					...projectsParticipation,
				];

				const columns = [
					{ label: oBundle.getText("month"), property: "rowTitle", width: 36 },
					...this._months.map((month) => {
						return {
							label: oBundle.getText(month),
							property: month,
						};
					}),
				];

				this._exportData(
					`${user.firstname}_${user.lastname}_skutecnost_${new Date().getFullYear() - 1}`,
					columns,
					data
				);
			},

			onPlanNextYearExportPress: function () {
				const EdmType = exportLibrary.EdmType;
				const oBundle = this.getView().getModel("i18n").getResourceBundle();
				const user = this.getView().getModel("detail").getProperty("/user");
				const planEval = this.getView().getModel("detail").getProperty("/planEvalNextYear");
				const planProjects = this.getView()
					.getModel("detail")
					.getProperty("/planProjectsNextYear");
				const planPresale = this.getView()
					.getModel("detail")
					.getProperty("/planPresaleNextYear");
				const planOffers = this.getView()
					.getModel("detail")
					.getProperty("/planOffersNextYear");
				const data = [...planEval];

				if (planProjects.length) {
					data.push(
						{},
						{ rowTitle: oBundle.getText("projectsTableTitle") },
						{},
						...planProjects.map((plan) => {
							return { rowTitle: plan.name, ...plan };
						})
					);
				}

				if (planOffers.length) {
					data.push(
						{},
						{ rowTitle: oBundle.getText("offersTableTitle") },
						{},
						...planOffers.map((plan) => {
							return { rowTitle: plan.name, ...plan };
						})
					);
				}

				if (planPresale.length) {
					data.push(
						{},
						{ rowTitle: oBundle.getText("presaleTableTitle") },
						{},
						...planPresale.map((plan) => {
							return { rowTitle: plan.subject, ...plan };
						})
					);
				}

				const columns = [
					{ label: oBundle.getText("month"), property: "rowTitle", width: 36 },
					...this._months.map((month) => {
						return {
							label: oBundle.getText(month),
							property: month,
							type: EdmType.Number,
						};
					}),
				];

				const nextYear = new Date().getFullYear() + 1;
				this._exportData(
					`${user.firstname}_${user.lastname}_plan_${nextYear}`,
					columns,
					data
				);
			},

			_exportData: function (title, columns, data) {
				const oSheet = new Spreadsheet({
					workbook: {
						columns,
						context: {
							application: "EP-Utils",
							sheetName: "Data",
						},
					},
					dataSource: data,
					fileName: `${title}.xlsx`,
				});

				oSheet.build().finally(function () {
					oSheet.destroy();
				});
			},

			onNavBack: function () {
				const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("main");
			},
		});
	}
);
