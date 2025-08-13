const utils = require("../util");

exports.getCustomFieldById = async (id) => {
	const res = await utils.getJSON(`custom_fields/${id}.xml`);

	return res;
};
