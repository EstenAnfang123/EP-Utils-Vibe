// const request = require("request");
const utils = require("../util");

exports.listExpectedRevenues = async (sParams = "limit=100") => {
	const url = utils.constructURL("easy_money_expected_revenues.xml", sParams);
	console.debug(url);

	const res = await utils.makeRequest(url);

	return res;
};

exports.getExpectedRevenuesJSON = async () => {
	const oParams = {
		par1: "easy_money_expected_revenues",
		par2: "easy_money_expected_revenue",
	};

	const res = utils.getAllObjects("easy_money_expected_revenues.xml", 100, oParams);
	return res;
};

exports.listExpectedExpenses = async (sParams = "limit=100") => {
	const url = utils.constructURL("easy_money_expected_expenses.xml", sParams);
	console.debug(url);

	const res = await utils.makeRequest(url);

	return res;
};

exports.getExpectedExpensesJSON = async () => {
	const oParams = {
		par1: "easy_money_expected_expenses",
		par2: "easy_money_expected_expense",
	};

	const res = utils.getAllObjects("easy_money_expected_expenses.xml", 100, oParams);
	return res;
};

//

exports.listRealRevenues = async (sParams = "limit=100") => {
	const url = utils.constructURL("easy_money_other_revenues.xml", sParams);
	console.debug(url);

	const res = await utils.makeRequest(url);

	return res;
};

exports.getRealRevenuesJSON = async () => {
	const oParams = {
		par1: "easy_money_other_revenues",
		par2: "easy_money_other_revenue",
	};

	const res = utils.getAllObjects("easy_money_other_revenues.xml", 100, oParams);
	return res;
};

exports.getRealRevenuesByIdJSON = async (id) => {
	const res = await utils.getJSON(`projects/${id}/easy_money_other_revenues.xml`);

	return res;
};

exports.listRealExpenses = async (sParams = "limit=100") => {
	const url = utils.constructURL("easy_money_other_expenses.xml", sParams);
	console.debug(url);

	const res = await utils.makeRequest(url);

	return res;
};

exports.getRealExpensesJSON = async () => {
	const oParams = {
		par1: "easy_money_other_expenses",
		par2: "easy_money_other_expense",
	};

	// const res = await utils.getObject('easy_money_other_expenses.xml', 100, top, page, oParams);
	const res = await utils.getAllObjects("easy_money_other_expenses.xml", 100, oParams);
	return res;
	// return Array.isArray(res) ? res : res.aRes;
};

exports.setRealExpensesJSON = async (data) => {
	// const options = {
	//   method: "PUT",
	//   uri: `http://www.easyproject.cz/easy_money_other_expenses/${id}.xml`,
	//   headers: {
	//     'Content-Type': 'application/xml'
	//   },
	//   body: "<easy_money><price2>1</price2></easy_money>"
	// }
	// request(options).then((err, res, body) => {
	//   console.log('Status:', res.statusCode);
	//   console.log('Headers:', JSON.stringify(res.headers));
	//   console.log('Response:', body);
	// });
	const url = utils.constructURL(`easy_money_other_expenses/${data.id}.xml`);
	const body = `
  <easy_money>
    <price2>${data.price2}</price2>
    <vat>${data.vat}</vat>
    <custom_fields type="array">
      <custom_field id="151">
        <value>${data.eso}</value>
      </custom_field>
    </custom_fields>
  </easy_money>`;

	const res = await utils.makeRequest(url, "PUT", body, true);
	return res;
};

exports.listRatesJSON = async (sParams = "limit=100") => {
	const res = await utils.getJSON(`easy_money_rates/easy_money_rate_users.xml`);

	return res;
};

exports.getProjectRates = async (id, sParams = "limit=100") => {
	const res = await utils.getJSON(`projects/${id}/easy_money_rates/easy_money_rate_users.xml`);

	return res;
};

exports.setProjectRate = async (data) => {
	const url = utils.constructURL(
		`projects/${data.projectId}/easy_money_rates/easy_money_rate_users.xml`
	);
	const body = `
		<easy_money_rates>
			<easy_money_rate_type id="1">
				<easy_money_rate id="${data.rate._attributes.id}" name="${data.rate._attributes.name}">
					<unit_rate>${data.rate.unit_rate}</unit_rate>
				</easy_money_rate>
			</easy_money_rate_type>
		</easy_money_rates>
	`;

	const res = await utils.makeRequest(url, "PUT", body, true);
	return res;
};
