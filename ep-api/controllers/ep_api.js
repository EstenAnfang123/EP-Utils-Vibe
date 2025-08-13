const request = require("request-promise");
const parser = require("fast-xml-parser");
// const config = require("../config");
const utils = require("./utils");
const util = require("../util");

const _privateConfig = {
	returnJson: true,
	baseUrl : "https://effiis.easyproject.cz",
	convertComonParams : {
		attributeNamePrefix: "",
		attrNodeName: "_attributes", //default is 'false'
		textNodeName: "#text",
		ignoreAttributes: false,
		ignoreNameSpace: false,
		allowBooleanAttributes: false,
		parseNodeValue: true,
		parseAttributeValue: true,
		trimValues: true,
		cdataTagName: "__cdata", //default is 'false'
		cdataPositionChar: "\\c",
		localeRange: "", //To support non english character in tag/attribute values.
		parseTrueNumberOnly: false
		// attrValueProcessor: a => he.decode(a, { isAttributeValue: true }),//default is a=>a
		// tagValueProcessor: a => he.decode(a) //default is a=>a
	},
	// epuser: config.users.user.login,
	// eppass: config.users.user.pass
};


const methods = {
	getIssueDetail: async (issueId, urlParams,json=true) => {
		//vytvorime url sluzby
		const url = _private._constructURL(
			`issues/${issueId}.xml`,
			"include=journals"
		);
		
		//zavolame sluzbu v api
		try {
			let res = await _private._makeRequest(url);

			//zkonvertujeme do json pokud je potreba
			res = json ? _private._xml2json(res) : res;

			return res;			
		} catch (err) {
			throw utils._error("ep_api/getIssueDetail",err.message,err,err.statusCode);
		}
	}	
};

const _private = {
	_getAllObjects: async (urlPath, urlLimit, oParam) => {
		const extParams = _private._parseUrlParams(oParam.urlParams, "end");
		let page = 0;
		let aRet = [];
		let totalCount = 0;
		let actualPosition = 0;
		do {
			page++;
			const url = _private._constructURL(
				urlPath,
				`${extParams}limit=${urlLimit}&page=${page}`
			);
			try {
				const xmlRes = await _private._makeRequest(url);
				//const oRes = convert.xml2js(xmlRes, convertCommonParams);
				// const tObj = parser.getTraversalObj(xmlRes, convertComonParams);
				// const oRes = parser.convertToJson(tObj, convertComonParams);
				const oRes = await _private._xml2json(xmlRes);
				let resAttrs = oRes[oParam["par1"]]._attributes;
				totalCount = parseInt(resAttrs.total_count);
				actualPosition = parseInt(resAttrs.offset) + parseInt(resAttrs.limit);
				let aRes = oRes[oParam.par1][oParam.par2];
				aRes = Array.isArray(aRes)
					? aRes
					: aRes == undefined
						? []
						: Array.of(aRes);
				aRet = [...aRet, ...aRes];
			} catch (err) {
				throw utils._error("ep_api/_getAllObjects",err.message,err,err.statusCode);		
			}
		} while (totalCount > actualPosition);
		return aRet;
	},

	_xml2json: async (xml) => {
		const tObj = await parser.getTraversalObj(xml,_privateConfig.convertComonParams);
		const oRes = await parser.convertToJson(tObj,_privateConfig.convertComonParams);
		return oRes;
	},

	_constructURL: (path, params) => {
		let url = "";
		if (!params) {
			url = `${_privateConfig.baseUrl}/${path}?set_filter=1`;
		} else {
			url = `${_privateConfig.baseUrl}/${path}?${params}&set_filter=1`;
		}
		return url;
	},	
	_makeRequest: async (url, method = "GET") => {
		let options = {
			method: method,
			uri: url,
			forever: true
		};
		try {
			const reqRes = await request(options).auth(
				// config.users.user.login,
				// config.users.user.pass,
				util.auth.login,
				util.auth.pwd,
				true
			);
			return reqRes;
		} catch (err) {
			// console.log(
			// 	`Chyba _makeRequest ${err.message} ${JSON.stringify(err.options)}`
			// );

			/*
				err = {"name":"StatusCodeError","statusCode":401,"message":"401 - \"\"","error":"","options":{"method":"GET","uri":"https://effiis.easyproject.cz/issues/3173.xml?include=journals&set_filter=1","forever":true,"simple":true,"resolveWithFullResponse":false,"transform2xxOnly":false},"response":{"statusCode":401,"body":"","headers":{"server":"nginx","date":"Wed, 03 Apr 2019 12:28:53 GMT","content-type":"application/xml","transfer-encoding":"chunked","connection":"keep-alive","x-frame-options":"SAMEORIGIN","x-xss-protection":"1; mode=block","x-content-type-options":"nosniff","cache-control":"no-cache","x-request-id":"d703ecc3-9d43-4d2f-9bfd-23fcf2077c8d","x-runtime":"0.009761"},"request":{"uri":{"protocol":"https:","slashes":true,"auth":null,"host":"effiis.easyproject.cz","port":443,"hostname":"effiis.easyproject.cz","hash":null,"search":"?include=journals&set_filter=1","query":"include=journals&set_filter=1","pathname":"/issues/3173.xml","path":"/issues/3173.xml?include=journals&set_filter=1","href":"https://effiis.easyproject.cz/issues/3173.xml?include=journals&set_filter=1"},"method":"GET","headers":{"authorization":"Basic YWRtaW46YidtNGttSVBh"}}}}
			*/
			throw utils._error("ep_api/_makeRequest",err.message,err,err.statusCode);
		}
	}
};

module.exports = methods;
