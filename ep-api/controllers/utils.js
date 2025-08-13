const _ = require("lodash");
// const moment = require('moment');
const constants = require("../models/constants");

exports._getCustomField = (customFields, custFieldParam) => {
	const res = customFields.filter(
		data => data._attributes.id == custFieldParam.id
	)[0];

	let ret = "";

	try {
		if (custFieldParam.par2 != undefined && custFieldParam.par2 != "") {
			ret = res[custFieldParam.par1][custFieldParam.par2];
		} else {
			ret = res[custFieldParam.par1];
		}
		return ret;
	} catch (err) {
		console.log(`err: ${err.message}`);
		return custFieldParam.missing != undefined
			? custFieldParam.missing
			: "Nevyplněno";
	}
};

exports._processMoneyRecord = (aRecords, recType) => {
	const oPrjConstants = _.pickBy(constants.customFieldsDb, rec => rec.obj == recType);

	for (let rec of aRecords) {
		let aCf = rec.custom_fields.custom_field;
		for (let cst in oPrjConstants) {
			// console.log(`${JSON.stringify(cst)}`);
			rec[oPrjConstants[cst].field] = this._getCustomField(aCf,oPrjConstants[cst]);
		}
	}
	console.log(`0: ${aRecords[0]}`);
	return aRecords;
};

exports.formatDateSAP = date => {
	var d = new Date(date),
		month = "" + (d.getMonth() + 1),
		day = "" + d.getDate(),
		year = d.getFullYear();

	if (month.length < 2) month = "0" + month;
	if (day.length < 2) day = "0" + day;

	return [year, month, day].join("");

};

exports._error = (name,message,body={},statusCode="") => {
	const obj = {};
	obj.name = name;
	obj.message = message;
	obj.body = body;
	obj.statusCode = statusCode;

	console.log(
		`Chyba ${name} ${message} ${JSON.stringify(body)}`
	);
	return obj;
};





