const ctrlReport = require("../ep-api/controllers/report");
// const utils = require("../ep-api/controllers/utils");
// const config = require("../ep-api/config");

const handlers = {
	issueTimeReport: async (req, res) => {
		// if (req.header("authorization") != undefined) {
		// 	config.users.user.setUserLogin(req.header("authorization"));
		// } else {
		// 	throw {status : 401};
		// }
		const issueId = req.params.issueId;
		try {
			ctrlReport.issueReportTime(issueId).then((data) => {
				// console.log(data);
				res.status(data.statusCode || 200).send(data);
			});
		} catch (err) {
			if (err.statusCode == 401) {
				req.status(err.statusCode).send(err.message);
			} else {
				// throw utils._error("router/issueTimeReport", err.message, err, err.statusCode);
				req.send(err.message);
			}
		}
	},
};

module.exports = handlers;
