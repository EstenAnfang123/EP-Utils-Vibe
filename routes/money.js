const express = require("express");

const moneyController = require("../controllers/moneyController");

const router = express.Router();

router.post("/api/v1/login", moneyController.login);

router.get("/api/v1/allprojects", moneyController.auth, moneyController.getAllProjects);

router.get("/api/v1/esoutil1/projects", moneyController.auth, moneyController.getProjectsJSON);
router.get(
	"/api/v1/esoutil1/projectdata/:id",
	moneyController.auth,
	moneyController.getProjectDataJSON
);
router.get(
	"/api/v1/esoutil1/projectdata/update/:id",
	moneyController.auth,
	moneyController.setProjectDataJSON
);

router.get(
	"/api/v1/esoutil2/getrealexpensesbyid/:id",
	moneyController.auth,
	moneyController.getRealExpensesById
);
router.post("/api/v1/esoutil2/updateproject", moneyController.auth, moneyController.updateProject);

router.post("/api/v1/esoutil4/exceldata", moneyController.auth, moneyController.excelData);

router.post(
	"/api/v1/rates/getRatesOfProjects",
	moneyController.auth,
	moneyController.getRatesOfProjects
);
router.put("/api/v1/rates/setProjectRate", moneyController.auth, moneyController.setProjectRate);

router.post("/api/v1/bonuses/getAllUsers", moneyController.auth, moneyController.getAllUsers);
router.post(
	"/api/v1/bonuses/updateTimeEntries",
	moneyController.auth,
	moneyController.updateTimeEntries
);

router.get(
	"/api/v1/getExpectedRevenues",
	moneyController.auth,
	moneyController.getExpectedRevenuesJSON
);
router.get("/api/v1/getRealRevenues", moneyController.auth, moneyController.getRealRevenuesJSON);
router.get("/api/v1/customFieldById/:id", moneyController.auth, moneyController.getCustomFieldById);
router.get("/api/v1/getRatesOfProjects", moneyController.auth, moneyController.getRatesOfProjects);
router.get("/api/v1/listAllRates", moneyController.auth, moneyController.listAllRates);
router.post(
	"/api/v1/getProjectTimeSpent",
	moneyController.auth,
	moneyController.getProjectTimeSpent
); //test
router.post("/api/v1/timeSpent", moneyController.auth, moneyController.timeSpent);
router.post(
	"/api/v1/getRatesByProjectId",
	moneyController.auth,
	moneyController.getRatesByProjectId
);
router.post(
	"/api/v1/getProjectIssues/:projectId",
	moneyController.auth,
	moneyController.getProjectIssues
);
router.post("/api/v1/issues", moneyController.auth, moneyController.getIssues);
router.post("/api/v1/getCRMCases", moneyController.auth, moneyController.getCRMCases);
router.post(
	"/api/v1/getCRMCases/:projectId",
	moneyController.auth,
	moneyController.getCRMCasesByProjectId
);
router.post("/api/v1/getAllUsers", moneyController.auth, moneyController.getAllUsers);
router.post("/api/v1/getAttendances", moneyController.auth, moneyController.getAttendances);
router.post(
	"/api/v1/getallprojects",
	moneyController.auth,
	moneyController.getAllProjectsBodyParams
);
router.post("/api/v1/getProjectsFromDB", moneyController.auth, moneyController.getProjectsFromDB);
router.post("/api/v1/saveProjectsIntoDB", moneyController.auth, moneyController.saveProjectsIntoDB);
router.post(
	"/api/v1/saveCrmProjectIssuesIntoDB",
	moneyController.auth,
	moneyController.saveCrmProjectIssuesIntoDB
);
router.post("/api/v1/getCrmIssuesFromDB", moneyController.auth, moneyController.getCrmIssuesFromDB);
router.post(
	"/api/v1/saveOpportunitiesIntoDB",
	moneyController.auth,
	moneyController.saveOpportunitiesIntoDB
);
router.post(
	"/api/v1/getOpportunitiesFromDB",
	moneyController.auth,
	moneyController.getOpportunitiesFromDB
);
router.delete(
	"/api/v1/deleteOpportunityFromDB",
	moneyController.auth,
	moneyController.deleteOpportunityFromDB
);
router.post("/api/v1/getOffersFromDB", moneyController.auth, moneyController.getOffersFromDB);
router.post("/api/v1/saveOffersIntoDB", moneyController.auth, moneyController.saveOffersIntoDB);
router.post("/api/v1/getContacts", moneyController.auth, moneyController.getContacts);
router.post("/api/v1/getCurrentUser", moneyController.auth, moneyController.getCurrentUser);
router.post("/api/v1/getProjectMembers", moneyController.auth, moneyController.getProjectMembers);
router.post(
	"/api/v1/saveProjectUsersIntoDB",
	moneyController.auth,
	moneyController.saveProjectUsersIntoDB
);
router.post(
	"/api/v1/getProjectTimeEntries",
	moneyController.auth,
	moneyController.getProjectTimeEntries
);
router.post(
	"/api/v1/getWorkingTimeFromDB",
	moneyController.auth,
	moneyController.getWorkingTimeFromDB
);
router.post(
	"/api/v1/saveWorkingTimeIntoDB",
	moneyController.auth,
	moneyController.saveWorkingTimeIntoDB
);
router.post(
	"/api/v1/getUsersOffersPlansFromDB",
	moneyController.auth,
	moneyController.getUsersOffersPlansFromDB
);
router.post(
	"/api/v1/saveOfferUsersIntoDB",
	moneyController.auth,
	moneyController.saveOfferUsersIntoDB
);
router.post(
	"/api/v1/getUsersInOfferFromDB",
	moneyController.auth,
	moneyController.getUsersInOfferFromDB
);
router.post(
	"/api/v1/saveOfferUsersPlnsIntoDB",
	moneyController.auth,
	moneyController.saveOfferUsersPlnsIntoDB
);

module.exports = router;
