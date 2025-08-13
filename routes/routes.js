const express = require("express");

const routeHandler = require("../controllers/routeHandler");

const router = express.Router();

router.get("/issue_time_report/:issueId", routeHandler.issueTimeReport);

module.exports = router;
