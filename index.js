const express = require("express");
const { queryParser } = require("express-query-parser");
const morgan = require("morgan");
const compression = require("compression");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const db = require("./db");

const app = express();

const moneyRoutes = require("./routes/money");
const routeHandler = require("./routes/routes");

app.use(compression());
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				"default-src": ["'self'", "sapui5.hana.ondemand.com"],
				"script-src": ["'self'", "sapui5.hana.ondemand.com"],
			},
		},
	})
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use(
	queryParser({
		parseNull: true,
		parseBoolean: true,
	})
);

if (process.env.NODE_ENV === "production") {
	app.use(morgan("combined"));
} else {
	app.use(morgan("dev"));
}

app.get("/healthz", async (req, res) => {
	try {
		await db.query("SELECT 1 + 1");
		return res.status(200).send();
	} catch (e) {
		console.error(e);
		return res.status(500).send();
	}
});

app.use(moneyRoutes);
app.use(routeHandler);

app.use(express.static("ui5"));

const port = process.env.PORT || 3000;

app.listen(port, () => {
	console.log(`Listening on port ${port}!!`);
});
