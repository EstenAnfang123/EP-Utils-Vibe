const utils = require("../util");
// const parser = require("fast-xml-parser");
/**
 * @link https://easyproject.docs.apiary.io/#reference/projects/projects-collection/list-all-projects
 *
 * @param {string} [sParams='limit=100']
 * @returns
 */
exports.listProjects = async (sParams = "limit=100") => {
	// TODO: add check for valid url params
	const url = utils.constructURL("projects.xml", sParams);
	console.debug(url);
	const res = await utils.makeRequest(url);
	return res;
};

exports.getAllProjectsJSON = async (urlParams = {}) => {
	const oParams = {
		par1: "projects",
		par2: "project",
		urlParams: urlParams,
	};

	const aRet = await utils.getAllObjects("projects.xml", 100, oParams);
	return aRet;
};

exports.retrieveProject = async (id) => {
	const res = await utils.getJSON(`projects/${id}.xml`);
	return res;
};

exports.listProjectUsers = async (projectId) => {
	const res = await utils.getJSON(`projects/${projectId}/memberships.xml`);
	return res;
};

exports.getProjectTimeEntries = async (id, urlParams = {}) => {
	const oParams = {
		par1: "time_entries",
		par2: "time_entry",
		urlParams: urlParams,
	};

	const aRet = await utils.getAllObjects(`projects/${id}/time_entries.xml`, 100, oParams);
	return aRet;
};
