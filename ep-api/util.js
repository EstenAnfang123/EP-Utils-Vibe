/* eslint-disable class-methods-use-this */
/* eslint-disable no-use-before-define */
const request = require("request-promise");
const parser = require("fast-xml-parser");

const convertComonParams = {
	attributeNamePrefix: "",
	attrNodeName: "_attributes", // default is 'false'
	textNodeName: "#text",
	ignoreAttributes: false,
	ignoreNameSpace: false,
	allowBooleanAttributes: false,
	parseNodeValue: true,
	parseAttributeValue: true,
	trimValues: true,
	cdataTagName: "__cdata", // default is 'false'
	cdataPositionChar: "\\c",
	localeRange: "", // To support non english character in tag/attribute values.
	parseTrueNumberOnly: false,
	// attrValueProcessor: a => he.decode(a, { isAttributeValue: true }),//default is a=>a
	// tagValueProcessor: a => he.decode(a) //default is a=>a
};

function getBaseCommonParams() {
	// TODO: check if convertCommonParam exists and is filled
	return convertComonParams;
}

const oEmptyAuth = {
	login: "",
	pwd: "",
};

class Utils {
	constructor() {
		this.baseUrl = "";
		this.auth = oEmptyAuth;
		this.initialized = false;
	}

	init(baseUrl, auth) {
		this.baseUrl = baseUrl;
		// TODO: check if auth has right structure
		this.auth = auth;
		this.initialized = true;
	}

	isInitialized() {
		if (!this.initialized) {
			throw new Error(`Error ${__filename} You need to set base URL and auth data first!`);
		}
	}

	constructURL(path, params = "") {
		this.isInitialized();
		let url = "";
		if (!params) {
			url = `${this.baseUrl}/${path}?set_filter=1`;
		} else {
			url = `${this.baseUrl}/${path}?${params}&set_filter=1`;
		}
		return url;
	}

	async makeRequest(url, method = "GET", body, auth = true) {
		this.isInitialized();
		const options = {
			method,
			uri: url,
			forever: true,
			headers: {
				"Content-Type": "application/xml",
			},
			body: body,
		};
		try {
			let reqRes = null;
			if (auth) {
				reqRes = await request(options).auth(this.auth.login, this.auth.pwd, true);
			} else {
				reqRes = await request(options);
			}

			return reqRes;
		} catch (err) {
			console.log(`Error makeRequest ${err.message} ${JSON.stringify(err.options)}`);
			throw new Error(`Error makeRequest ${err.message} ${JSON.stringify(err.options)}`);
		}
	}

	async getJSON(urlPath, limit = "limit=100") {
		const url = this.constructURL(urlPath, limit);
		const xmlRes = await this.makeRequest(url);
		const tObj = parser.getTraversalObj(xmlRes, getBaseCommonParams());
		const oRes = parser.convertToJson(tObj, convertComonParams);
		return oRes;
	}

	async getObject(urlPath, urlLimit, top, page, oParam) {
		if (top === 0 && page === 0) {
			return await this.getAllObjects(urlPath, urlLimit, oParam);
		} else {
			if (top == 0) {
				top = 10;
			}
			return await this.getPageOfObjects(urlPath, page, top, oParam);
		}
	}

	async getAllObjects(urlPath, urlLimit, oParam) {
		// const extParams = methods._parseUrlParams(oParam.urlParams, 'end');
		let page = 0;
		let aRet = [];
		let totalCount = 0;
		let actualPosition = 0;
		do {
			page += 1;
			// eslint-disable-next-line no-await-in-loop
			const ret = await this.getPageOfObjects(urlPath, page, urlLimit, oParam);
			aRet = [...aRet, ...ret.aRes];
			({ totalCount, actualPosition } = ret);
		} while (totalCount > actualPosition);
		return aRet;
	}

	//Needs rate limiter like p-queue npm package
	/*async getAllObjects(urlPath, urlLimit, oParam) {
		let page = 1;
		let aRet = [];
		let totalCount = 0;

		const ret = await this.getPageOfObjects(urlPath, page, urlLimit, oParam);
		aRet = [...aRet, ...ret.aRes];
		({ totalCount } = ret);

		const numOfRequests = Math.ceil(totalCount / urlLimit);

		const promises = [];
		for (let i = 1; i < numOfRequests; i++) {
			promises.push(
				this.getPageOfObjects(urlPath, i + 1, urlLimit, oParam).then((res) => {
					aRet = [...aRet, ...res.aRes];
				})
			);
		}

		return aRet;
	}*/

	async getPageOfObjects(urlPath, page, urlLimit, oParam = { urlParams: "" }) {
		const extParams = parseUrlParams(oParam.urlParams, "end");
		const url = this.constructURL(urlPath, `${extParams}limit=${urlLimit}&page=${page}`);
		const xmlRes = await this.makeRequest(url);
		const tObj = parser.getTraversalObj(xmlRes, getBaseCommonParams());
		const oRes = parser.convertToJson(tObj, convertComonParams);
		const resAttrs = oRes[oParam.par1]._attributes;
		const totalCount = parseInt(resAttrs.total_count, 10);
		const actualPosition = parseInt(resAttrs.offset, 10) + parseInt(resAttrs.limit, 10);
		let aRes = oRes[oParam.par1][oParam.par2];
		if (!Array.isArray(aRes)) {
			if (aRes === undefined) {
				aRes = [];
			} else {
				aRes = Array.of(aRes);
			}
		}
		return {
			totalCount,
			actualPosition,
			aRes,
		};
	}
}

function parseUrlParams(oParams = {}, addAnd = "") {
	if (isEmptyObject(oParams)) {
		return "";
	}
	let sRet = addAnd === "begin" ? "&" : "";
	Object.keys(oParams).forEach((sKey) => {
		sRet += `${sKey}=${oParams[sKey]}&`;
	});

	if (addAnd !== "end") {
		sRet = sRet.slice(0, -1); // remove last character
	}
	return sRet;
}

function isEmptyObject(oObj) {
	if (oObj === undefined || Object.keys(oObj).length === 0) {
		return true;
	}
	return false;
}

module.exports = new Utils();
