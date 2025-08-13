// const dotenv = require("dotenv-safe");
// const path = require("path");
// const requireProcessEnv = name => {
// 	if (!process.env[name]) {
// 		throw new Error("You must set the " + name + " enviroment variable");
// 	}
// 	return process.env[name];
// };

// dotenv.config({
// 	path: path.join(__dirname, ".env"),
// 	sample: path.join(__dirname, ".env.example")
// });

//timezone 
process.env.TZ = "Europe/Prague";

const oConfig = {
	// users: {
	// 	admin: {
	// 		login: requireProcessEnv("EP_ADMIN_LOGIN"),
	// 		pass: requireProcessEnv("EP_ADMIN_PASS")
	// 	},
	// 	user: {
	// 		login: "",
	// 		pass: "",
	// 		setUserLogin : (authString) => {
	// 			const base64 = authString.split(" ")[1];
	// 			const buff = Buffer.from(base64,"base64");
	// 			const textPlain = buff.toString("utf8");
	// 			const aSplit = textPlain.split(":");
	// 			oConfig.users.user.login = aSplit[0];
	// 			oConfig.users.user.pass = aSplit[1];
	// 		}
	// 	}
	// },
	moment: {
		workinghours: {
			0: null,
			1: ["09:00:00", "17:00:00"],
			2: ["09:00:00", "17:00:00"],
			3: ["09:00:00", "17:00:00"],
			4: ["09:00:00", "17:00:00"],
			5: ["09:00:00", "17:00:00"],
			6: null
		},
		holidays: [
			"*-01-01", //Den obnovy samostatného českého státu Nový rok
			"*-04-19", //Velký pátek
			"*-04-22", //Velikonoční pondělí
			"*-05-01", //Svátek práce
			"*-05-08", //Den vítězství
			"*-07-05", //Den slovanských věrozvěstů Cyrila a Metoděje
			"*-07-06", //Den upálení mistra Jana Husa
			"*-09-28", //Den české státnosti
			"*-10-28", //Den vzniku samostatného československého státu
			"*-11-17", //Den boje za svobodu a demokracii
			"*-12-24", //Štědrý den
			"*-12-25", //1. svátek vánoční (Slavnost Narození Páně)
			"*-12-26"  //2. svátek vánoční (Svátek svatého Štěpána)
		]
	}
};



module.exports = oConfig;