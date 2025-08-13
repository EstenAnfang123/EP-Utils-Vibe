const epApi = require("./ep_api");
const rep1 = require("./reports/report1");
const utils = require("./utils");

const report = {
	issueReportTime: async (issueId) => {
		try {
			const oDet = await epApi.getIssueDetail(issueId);
			const oRes = await rep1.issueReportTime(oDet);
			return oRes;
		} catch (err) {
			return utils._error("report/issueReportTime",err.message,err,err.statusCode);
		}

	}
};

module.exports = report;
