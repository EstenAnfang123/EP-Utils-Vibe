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

		return Controller.extend("sap.ui.demo.basicTemplate.controller.UtilizationByOffer", {
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
				this._dialogs = {};
				this._i18n = new ResourceModel({
					bundleName: "sap.ui.demo.basicTemplate.i18n.i18n",
				}).getResourceBundle();

				this.getView().setModel(
					new JSONModel({
						offers: [],
						users: [],
					})
				);
				this.getView().setModel(new JSONModel({ usersCount: 0 }), "metadata");
				this.getView().setModel(
					new JSONModel({
						offer: null,
						workersPlan: [],
						workersPlanNext: [],
					}),
					"detail"
				);

				this._initMasterData();
			},

			_initMasterData: async function () {
				sap.ui.core.BusyIndicator.show();

				const oView = this.getView();
				const offersListBinding = this.getView().byId("offersList").getBinding("items");

				const offersPromise = this._loadOffers();
				const usersPromise = this._loadUsers();

				let [offers, users] = await Promise.all([offersPromise, usersPromise]);

				oView.getModel().setProperty("/offers", offers);
				oView.getModel().setProperty("/users", users);
				oView
					.getModel("metadata")
					.setProperty("/offersCount", offersListBinding.getLength());

				sap.ui.core.BusyIndicator.hide();
			},

			_loadOffers: async function () {
				const offers = [];
				try {
					const response = await fetch("/api/v1/getCRMCases", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							"f[easy_crm_case_status_id]": "3|9",
							sort: "created_at",
						}),
					});

					offers.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingOffers"));
				}

				return offers;
			},

			_loadUsers: async function () {
				const users = [];

				try {
					const response = await fetch("/api/v1/getAllUsers", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							params: {
								// include: "memberships",
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

			_loadUsersOffersPlans: async function (offerId, year) {
				const users = [];

				try {
					const response = await fetch("/api/v1/getUsersOffersPlansFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							offer_id: offerId,
							year,
						}),
					});
					users.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingUsers"));
				}

				return users;
			},

			_loadUsersInOffer: async function (offerId) {
				const usersInOffer = [];

				try {
					const response = await fetch("/api/v1/getUsersInOfferFromDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							offer_id: offerId,
						}),
					});
					usersInOffer.push(...(await response.json()));
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorLoadingUsers"));
				}

				return usersInOffer;
			},

			_saveUsersOffersPlans: async function (data) {
				try {
					await fetch("/api/v1/saveOfferUsersIntoDB", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(data),
					});
				} catch (e) {
					const oBundle = this.getView().getModel("i18n").getResourceBundle();
					MessageBox.error(oBundle.getText("errorSavingOfferPlans"));
				}

				return;
			},

			_saveOfferUsersPlnsIntoDB: async function (offerId, users, year) {
				try {
					await fetch(`/api/v1/saveOfferUsersPlnsIntoDB`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							offerId,
							users,
							year,
						}),
					});

					MessageToast.show(this._i18n.getText("successSavingProjectUsers"));
				} catch (e) {
					MessageBox.error(this._i18n.getText("errorSavingProjectUsers"));
				}
			},

			onRefreshOffersPress: function () {
				this._initMasterData();
			},

			onPressOffersItem: function (oEvent) {
				const offer = oEvent.getParameter("listItem").getBindingContext().getObject();

				this._initDetail(offer);
			},

			onEditOfferUsersPress: async function (offerId) {
				const users = this.getView().getModel().getProperty("/users");
				this._selectedOfferUsersId = offerId;

				const usersInOffer = await this._loadUsersInOffer(offerId);
				const usersInOffersIds = usersInOffer.map((userInOffer) => userInOffer.user_id);

				const usersWithSelectedAttr = users.map((user) => {
					return { ...user, selected: usersInOffersIds.includes(user.id) };
				});

				this.getView().getModel().setProperty("/users", usersWithSelectedAttr);

				this._openDialog("UsersDialog");
			},

			_openDialog: async function (dialogName) {
				let dialog = this._dialogs[dialogName];

				if (!dialog) {
					this._dialogs[dialogName] = await Fragment.load({
						id: this.getView().getId(),
						name: `sap.ui.demo.basicTemplate.view.UtilizationByOfferFragments.${dialogName}`,
						controller: this,
					});

					this.getView().addDependent(this._dialogs[dialogName]);
				}

				this._dialogs[dialogName].open();
			},

			onUsersDialogSearch: function (event) {
				const binding = event.getParameter("itemsBinding");
				const value = event.getParameter("value");
				const filters = [];

				if (value) {
					filters.push(
						new Filter([
							new Filter("firstname", FilterOperator.StartsWith, value),
							new Filter("lastname", FilterOperator.StartsWith, value),
						])
					);
				}

				binding.filter(filters, "Application");
			},

			onUsersDialogConfirm: async function (event) {
				const offer = this.getView().getModel("detail").getProperty("/offer");
				const users = this.getView().getModel().getProperty("/users");
				const selectedItems = event.getParameter("selectedItems");
				const offerUsersPlans = [];

				for (let selectedItem of selectedItems) {
					const item = selectedItem.getBindingContext().getObject();

					offerUsersPlans.push(
						this._fillMissingMonths({
							user_id: item.id,
						})
					);
				}

				await this._saveUsersOffersPlans({
					offerId: this._selectedOfferUsersId,
					data: offerUsersPlans,
				});

				if (this._selectedOfferUsersId === offer.id) {
					this._initDetail(offer);
				}

				const usersWithSelectedAttr = users.map((user) => {
					delete user.selected;
					return user;
				});

				this.getView().getModel().setProperty("/users", usersWithSelectedAttr);

				this._selectedOfferUsersId = null;
			},

			onUsersDialogCancel: function (event) {
				const users = this.getView().getModel().getProperty("/users");

				const usersWithSelectedAttr = users.map((user) => {
					delete user.selected;
					return user;
				});

				this.getView().getModel().setProperty("/users", usersWithSelectedAttr);

				this._selectedOfferUsersId = null;
			},

			_initDetail: async function (offer) {
				const oView = this.getView();
				const users = oView.getModel().getProperty("/users");

				oView.setBusy(true);

				const currentYear = new Date().getFullYear();
				const nextYear = new Date().getFullYear() + 1;

				const usersInOfferPromise = this._loadUsersInOffer(offer.id);
				const usersOffersPlansPromise = this._loadUsersOffersPlans(offer.id, currentYear);
				const usersOffersPlansNextPromise = this._loadUsersOffersPlans(offer.id, nextYear);

				const [usersInOffer, usersOffersPlans, usersOffersPlansNext] = await Promise.all([
					usersInOfferPromise,
					usersOffersPlansPromise,
					usersOffersPlansNextPromise,
				]);

				const workersPlan = usersInOffer.map((userInOffer) => {
					const userPlan = usersOffersPlans.find(
						(plan) => plan.user_id === userInOffer.user_id
					);
					const user = users.find((item) => item.id === userInOffer.user_id);

					const userName = `${user.firstname} ${user.lastname}`.trim();

					return this._fillMissingMonths({
						...userPlan,
						user_id: userInOffer.user_id,
						name: userName,
					});
				});

				const workersPlanNextYear = usersInOffer.map((userInOffer) => {
					const userPlan = usersOffersPlansNext.find(
						(plan) => plan.user_id === userInOffer.user_id
					);
					const user = users.find((item) => item.id === userInOffer.user_id);

					const userName = `${user.firstname} ${user.lastname}`.trim();

					return this._fillMissingMonths({
						...userPlan,
						user_id: userInOffer.user_id,
						name: userName,
					});
				});

				oView.getModel("detail").setProperty("/offer", offer);
				oView.getModel("detail").setProperty("/workersPlan", workersPlan);
				oView.getModel("detail").setProperty("/workersPlanNextYear", workersPlanNextYear);

				oView.setBusy(false);
			},

			onOfferUsersPlansSubmit: function () {
				const detailModel = this.getView().getModel("detail");
				const offer = detailModel.getProperty("/offer");
				const workersPlan = detailModel.getProperty("/workersPlan");
				const year = new Date().getFullYear();

				this._saveOfferUsersPlnsIntoDB(offer.id, workersPlan, year);
			},

			onOfferUsersPlansNextYearSubmit: function () {
				const detailModel = this.getView().getModel("detail");
				const offer = detailModel.getProperty("/offer");
				const workersPlan = detailModel.getProperty("/workersPlanNextYear");
				const year = new Date().getFullYear() + 1;

				this._saveOfferUsersPlnsIntoDB(offer.id, workersPlan, year);
			},

			onRefreshOfferPress: function () {
				const offer = this.getView().getModel("detail").getProperty("/offer");

				this._initDetail(offer);
			},

			onSearch: function (oEvent) {
				const searchValue = oEvent.getParameter("newValue");
				const offersList = this.getView().byId("offersList");
				const aFilters = [];

				if (searchValue) {
					aFilters.push(
						new Filter(
							[new Filter("name", FilterOperator.Contains, searchValue)],
							false
						)
					);
				}

				offersList.getBinding("items").filter(aFilters, "Application");
			},

			_fillMissingMonths: function (data) {
				this._months.forEach((item) => {
					if (!(item in data)) data[item] = 0;
				});
				return data;
			},

			onNavBack: function () {
				const oRouter = sap.ui.core.UIComponent.getRouterFor(this);
				oRouter.navTo("main");
			},
		});
	}
);
