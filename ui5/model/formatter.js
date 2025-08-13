// eslint-disable-next-line no-undef
sap.ui.define([], function () {
	"use strict";
	return {
		totalRows: function (data) {
			return data.length;
		},
		totalProjects: function (data) {
			const uniqueProjects = new Set(
				data.map((item) => {
					return item.projectId;
				})
			);

			switch (uniqueProjects.size) {
				case 1:
					return `${uniqueProjects.size} projekt`;
				case 2:
				case 3:
				case 4:
					return `${uniqueProjects.size} projekty`;
				default:
					return `${uniqueProjects.size} projektů`;
			}
		},

		formatHours: function (value) {
			const hours = Math.trunc(value);
			//const minutes = ((value + "").split(".")[1] * 60) / 100;
			const minutes = Math.round((value - hours) * 60);

			return `${hours} hodin ${minutes ? minutes + " minut" : ""}`;
		},

		hoursLeft: function (estimatedHours, spentHours) {
			const leftHours = estimatedHours - spentHours;
			const hours = Math.trunc(leftHours);
			//const minutes = ((leftHours + "").split(".")[1] * 60) / 100;
			const minutes = Math.abs(Math.round((leftHours - hours) * 60));

			return `${hours} hodin ${minutes ? minutes + " minut" : ""}`;
		},

		findTMFIX: function (data) {
			const tmfixIndex = data.custom_fields.custom_field.findIndex(
				(item) => item._attributes.id === 80
			);
			return data.custom_fields.custom_field[tmfixIndex].value.replace("&amp;", "&");
		},

		/*sumExpectedRevenue: function (data) {
			const oCurrency = new sap.ui.model.type.Currency({
				showMeasure: true,
				preserveDecimals: false,
			});
			const amount = data?.reduce((prev, curr) => prev + curr.expectedRevenue, 0);
			const currency = data[0]?.expectedRevenueCurrency || "CZK";

			return oCurrency.formatValue([amount, currency], "string");
		},
		sumRealRevenue: function (data) {
			const oCurrency = new sap.ui.model.type.Currency({
				showMeasure: true,
				preserveDecimals: false,
			});
			const amount = data?.reduce((prev, curr) => prev + curr.realRevenue, 0);
			const currency = data[0]?.realRevenueCurrency || "CZK";

			return oCurrency.formatValue([amount, currency], "string");
		},
		sumProjectRevenue: function (data) {
			const oCurrency = new sap.ui.model.type.Currency({
				showMeasure: true,
				preserveDecimals: false,
			});
			const amount = data?.reduce((prev, curr) => prev + curr.projectRevenue, 0);
			const currency = data[0]?.projectBudgetsCurrency || "CZK";

			return oCurrency.formatValue([amount, currency], "string");
		},*/

		toInvoicing: function (projectRevenue, realRevenue, currency) {
			const oCurrency = new sap.ui.model.type.Currency({
				showMeasure: true,
			});
			const amount = projectRevenue - realRevenue;

			return oCurrency.formatValue([amount, currency || "CZK"], "string");
		},

		percentDone: function (data) {
			const hoursLeft = data.sum_estimated_hours - data.sum_time_entries;
			const percentDone = 100 - (hoursLeft * 100) / data.sum_estimated_hours;

			if (Number.isFinite(percentDone)) {
				return `${Math.round(percentDone)}%`;
			}

			return `N/A`;
		},

		/*projectCount: function (data) {
			return (
				this.getView().byId("projectsTable")?.getBinding("items")?.getContexts()?.length ||
				data.length
			);
		},*/

		userRelationship: function (customFields) {
			if (!customFields) return "";

			const field = customFields.find((item) => item["_attributes"].id === 154);

			return field.value;
		},

		itemsCount: function (text, count) {
			return `${text} (${count ?? 0})`;
		},

		formatPercent: function (value) {
			if (isNaN(value)) return "0%";
			return `${Math.round((Number(value) + Number.EPSILON) * 100) / 100}%`;
		},

		roundTo3Decimals: function (value) {
			if (!value) return 0;
			if (String(value).includes("%")) return value;
			return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
		},
		capitalizeFirstLetter: function (string) {
			return string.charAt(0).toUpperCase() + string.slice(1);
		},
		formatTextNextYear: function (text) {
			if (!text) return "";

			const nextYear = new Date().getFullYear() + 1;

			return `${text} ${nextYear}`;
		},
		formatTextPrevYear: function (text) {
			if (!text) return "";

			const prevYear = new Date().getFullYear() - 1;

			return `${text} ${prevYear}`;
		},
		formatUserName: function (firstName, lastName) {
			return `${firstName} ${lastName}`.trim();
		},
		getNegativeStyleClass: function (value) {
	        if (value < 0) {
				value.addStyleClass("red");
		    	return value;
			}
			else {
				return value;
			}
		},
	};
});
