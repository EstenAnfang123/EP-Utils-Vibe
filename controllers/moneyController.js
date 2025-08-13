const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const request = require("request");
const mime = require("mime");
const format = require("pg-format");
const { v4: uuidv4 } = require("uuid");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const ep_api = require("../ep-api/index");
const util = require("../ep-api/controllers/utils");
const constants = require("../ep-api/models/constants").customFields;
const db = require("../db");

exports.login = (req, res) => {
	const login = req.get("login");
	const pwd = req.get("pwd");

	epapi = new ep_api("https://effiis.easyproject.cz", {
		login: login,
		pwd: pwd,
	});

	epapi.users
		.listUsersJSON(1, 1, { login })
		.then((response) => {
			const jwtSecret = process.env.JWT_SECRET;
			const now = Math.floor(Date.now() / 1000);
			const token = jwt.sign(
				{
					iat: now,
					nbf: now,
					exp: now + 60 * 60 * 12,
					jti: crypto.randomBytes(12).toString("hex"),
					iss: "EP-Utils",
					aud: "ep-utils.onrender.com",
					data: { userId: response.aRes[0].id },
				},
				jwtSecret,
				{ algorithm: "HS512" }
			);

			return res
				.status(200)
				.cookie("access_token", token, {
					httpOnly: true,
					secure: process.env.NODE_ENV === "production",
				})
				.send({ success: true });
		})
		.catch(() => res.status(401).send({ success: false }));
};

exports.auth = (req, res, next) => {
	const token = req.cookies.access_token;

	if (!token) return res.sendStatus(401);

	try {
		const tokenData = jwt.verify(token, process.env.JWT_SECRET);
		req.userId = tokenData.data.userId;
		req.epapi = epapi;
		return next();
	} catch (e) {
		return res.sendStatus(401);
	}
};

exports.listAllRates = async (req, res) => {
	try {
		const rates = await req.epapi.money.listRatesJSON();
		return res.status(200).send(rates);
	} catch (error) {
		console.log(error.message);
		return res.status(403).send({ message: error.message });
	}
};

exports.getRatesOfProjects = async (req, res) => {
	const projects = await req.epapi.projects.getAllProjectsJSON();
	const ratesofProjects = [];

	for (const project of projects) {
		try {
			const data = await req.epapi.money.getProjectRates(project.id);
			ratesofProjects.push({ projectId: project.id, projectName: project.name, ...data });
		} catch (e) {
			console.log(`Error reading rates of project ${project.id}.`);
		}
	}

	return res.send(ratesofProjects);
};

exports.getRatesByProjectId = async (req, res) => {
	const { projectsIds } = req.body;
	const data = [];

	for (let id of projectsIds) {
		try {
			const rates = await req.epapi.money.getProjectRates(id);
			data.push({ projectId: id, ...rates });
		} catch (error) {
			console.log(`Error fetching rates of project ${id}`);
		}
	}

	if (!data || data.length < 1)
		return res.status(403).send({ message: "You can not access rates of projects" });

	return res.status(200).send(data);
};

exports.setProjectRate = async (req, res) => {
	const body = req.body;
	const response = await req.epapi.money.setProjectRate(body);
	res.send(response);
};

exports.getProjectDataJSON = (req, res) => {
	const ids = req.params.id.split(",");
	console.log(ids);
	console.log(req.query.top);

	req.epapi.money
		.getRealExpensesJSON()
		.then((obj) => {
			return getExpensesArray(obj, ids);
		})
		.then((data) => {
			if (data.length) {
				// const pagedData = createPaging(aData, req.query.top, req.query.page);
				// res.status(200).send({ data: pagedData });
				res.status(200).send({ data: data });
			} else {
				res.status(401).send({
					success: "false",
					message: "Data not retrieved",
				});
			}
		})
		.catch(() => {
			// console.log(err);
			res.status(401).send({ success: false });
		});
};

function getExpensesArray(obj, ids) {
	const aData = [];
	ids.forEach((id) => {
		obj.filter((record) => {
			const eso = util._getCustomField(
				record.custom_fields.custom_field,
				constants.castka_eso
			);
			return (
				id == record.entity_id && record.entity_type == "Project" && (eso == 0 || eso == "")
			);
		}).forEach((item) => {
			const eso = util._getCustomField(item.custom_fields.custom_field, constants.castka_eso);
			let data = {
				id: item.id,
				projectId: item.entity_id,
				date: item.spent_on,
				name: item.name,
				price2: item.price2,
				vat: item.vat,
				eso: eso || 0,
				currency: item.easy_currency_code,
				supplier: item.custom_fields.custom_field[1].name,
			};
			aData.push(data);
		});
	});
	return aData;
}

// function createPaging(data, top, page) {
//     let from, to;
//     if (top != 0) {
//         from = top * page;
//         to = top * page + +top;
//         return data.slice(from, to);
//     }
//     return data;
// }

exports.getAllProjects = (req, res) => {
	const params = req.query;

	req.epapi.projects
		.getAllProjectsJSON(params)
		.then((projects) => res.status(200).send({ success: true, projects: projects }))
		.catch(() => res.status(401).send({ success: false }));
};

exports.getRealExpensesById = (req, res) => {
	let aData = [];
	const ids = req.params.id.split(",");

	req.epapi.money
		.getRealExpensesJSON()
		.then((expenses) => {
			aData = getExpensesData(expenses, ids);
		})
		.then(() => {
			req.epapi.projects
				.getAllProjectsJSON()
				.then((projects) => {
					aData.forEach((item, i) => {
						let index = projects.findIndex((x) => x.id == item.projectId);
						if (index !== -1) {
							aData[i].projectName = projects[index].name;
						}
					});
				})
				.then(() => {
					// console.log(aData);
					res.status(200).send({ success: true, expenses: aData });
				})
				.catch(() => res.status(401).send({ success: false }));
		});
};

function getExpensesData(expenses, ids) {
	const aData = [];
	ids.forEach((id) => {
		expenses
			.filter((record) => {
				return id == record.entity_id && record.entity_type == "Project";
			})
			.forEach((expense) => {
				const eso = util._getCustomField(
					expense.custom_fields.custom_field,
					constants.castka_eso
				);
				aData.push({
					id: expense.id,
					projectId: expense.entity_id,
					// date: expense.spent_on,
					name: expense.name,
					price2: expense.price2 || 0,
					// vat: expense.vat,
					eso: eso || 0,
					// currency: expense.easy_currency_code,
					supplier: expense.custom_fields.custom_field[1].name,
				});
			});
	});
	return aData;
}

//TEST if works
exports.setProjectDataJSON = (req, res) => {
	const updatedData = [];
	const id = req.params.id;
	req.epapi.money
		.getRealExpensesJSON()
		.then((data) => {
			filterData(data, id).forEach((item) => {
				updatedData.push({
					id: item.id,
					price2: item.price2,
					vat: item.vat,
					eso: item.price2,
				});
				req.epapi.money.setRealExpensesJSON({
					id: item.id,
					price2: item.price2,
					vat: item.vat,
				});
			});
		})
		.then(() => {
			res.status(200).send({
				success: "true",
				message: "Data updated",
				data: updatedData,
			});
		})
		.catch((err) => console.log(err));
};

function filterData(data, id) {
	return data.filter((record) => {
		const eso = util._getCustomField(record.custom_fields.custom_field, constants.castka_eso);
		//https://eslint.org/docs/rules/no-prototype-builtins
		return (
			Object.prototype.hasOwnProperty.call(record, "custom_fields") &&
			record.entity_type == "Project" &&
			id == record.entity_id &&
			(eso === "" || eso === 0)
		);
	});
}

//TEST if works
exports.getProjectsJSON = (req, res) => {
	req.epapi.projects
		.getAllProjectsJSON()
		.then((projects) => {
			return getProjectsIdsAndNames(projects);
		})
		.then((projects) => {
			req.epapi.money
				.getRealExpensesJSON()
				.then((obj) => {
					return getUniqueProjectsIds(obj);
				})
				.then((aData) => {
					return matchRecordsWithProjectNames(aData, projects);
				})
				.then((projects) => {
					res.status(200).send({
						success: "true",
						projects: projects,
					});
				});
		})
		.catch(() => {
			res.status(401).send({ success: false });
		});
};

function getProjectsIdsAndNames(projects) {
	const aProjects = [];
	projects.forEach((project) => {
		aProjects.push({
			id: project.id,
			name: project.name,
		});
	});
	return aProjects;
}

function matchRecordsWithProjectNames(aData, projects) {
	const projectsData = aData.map((item) => {
		let index = projects.findIndex((x) => x.id == item.id);

		return { id: item.id, name: projects[index].name };
	});
	return projectsData;
}

function getUniqueProjectsIds(obj) {
	const aData = [];
	obj.filter((record) => {
		const eso = util._getCustomField(record.custom_fields.custom_field, constants.castka_eso);
		return (
			Object.prototype.hasOwnProperty.call(record, "custom_fields") &&
			record.entity_type == "Project" &&
			(eso == 0 || eso == "")
		);
	}).forEach((item) => {
		let data = {
			id: item.entity_id,
		};
		let index = aData.findIndex((x) => x.id == data.id);
		if (index === -1) {
			aData.push(data);
		}
	});
	return aData;
}

// function matchProjectWithRecords(){

// }

exports.updateProject = (req, res) => {
	const itemsToUpdate = req.body;
	const aData = [];
	console.log(req.body);

	itemsToUpdate.forEach((item) => {
		switch (item.selectedIndex) {
			case 1:
				setPrice2To0(item);
				break;
			case 2:
				//eso -> castka bez dph
				let records = setPrice2ToEso(item);
				records.forEach((item) => aData.push(item));
				break;
			default:
				console.log("Selected: Other");
		}
	});
	res.status(200).send(aData);
};

function setPrice2To0(item) {
	for (let [key, value] of Object.entries(item)) {
		if (key != "selectedIndex") {
			req.epapi.money.setRealExpensesJSON({
				id: value.id,
				eso: value.eso,
				price2: 0,
			});
			// aData.push({success: true});
		}
	}
}

function setPrice2ToEso(item) {
	const aData = [];
	for (let [key, value] of Object.entries(item)) {
		if (key != "selectedIndex") {
			if (value.price2 == 0) {
				req.epapi.money.setRealExpensesJSON({
					id: value.id,
					eso: value.eso,
					price2: value.eso,
				});
				// aData.push({ success: true });
			} else {
				if (value.price2 != value.eso) {
					aData.push({
						success: false,
						projectId: value.projectId,
						name: value.name,
					});
				}
			}
		}
	}
	return aData;
}

exports.excelData = (req, res) => {
	req.epapi.projects
		.getAllProjectsJSON()
		.then((projects) => {
			const filteredProjects = projects.map((project) => {
				const tmfix = util._getCustomField(
					project.custom_fields.custom_field,
					constants.TMFIX
				);
				const customer = util._getCustomField(
					project.custom_fields.custom_field,
					constants.konecnyZakaznik
				);
				const owner = util._getCustomField(
					project.custom_fields.custom_field,
					constants.majitel_projektu
				);
				const manager = util._getCustomField(
					project.custom_fields.custom_field,
					constants.manazerProjektu
				);

				return {
					id: project.id,
					name: project.name,
					tmfix: tmfix.replace("&amp;", "&"),
					customer: customer,
					owner: owner,
					manager: manager,
					startDate: project.start_date,
					dueDate: project.due_date,
					status: project.status,
				};
			});

			const projectsWithUsers = filteredProjects.map((project) => {
				return getProjectUsers(project.id).then((users) => {
					return {
						...project,
						users: users.map((user) => user.name).toString(),
						owner: project.owner
							? users.filter((user) => user.id == project.owner)[0].name
							: "",
						manager: project.manager
							? users.filter((user) => user.id == project.manager)[0].name
							: "",
					};
				});
			});

			Promise.all(projectsWithUsers).then((data) => {
				const filePath = path.join(__dirname, "..", "res", "Projekty template.xlsx");

				const workbook = XLSX.readFile(filePath, {
					type: "file",
					cellStyles: true,
					cellHTML: false,
					cellFormula: false,
					cellText: false,
				});

				let worksheet = workbook.Sheets[workbook.SheetNames[0]];
				XLSX.utils.sheet_add_json(worksheet, data, {
					skipHeader: true,
					origin: "A2",
					header: [
						"id",
						"name",
						"tmfix",
						"customer",
						"owner",
						"manager",
						"users",
						"startDate",
						"dueDate",
						"status",
					],
				});

				XLSX.writeFile(workbook, "Projekty.xlsx");

				const file = "Projekty.xlsx";
				const onedrive_folder = "test";
				const onedrive_filename = "Projekty.xlsx";
				// console.log(req.body.code);
				const code = req.body.code;
				request.post(
					{
						url: "https://login.microsoftonline.com/organizations/oauth2/v2.0/token",
						form: {
							redirect_uri: "http://localhost:3000",
							client_id: "f9671401-bd80-4952-88f4-84737913b41b",
							client_secret: "uK-ums3c2NobD~UW43Zn-SGA8.0vSamZRm",
							// scope: "https://graph.microsoft.com/.default",
							scope: "files.readwrite",
							code: code,
							// resource: "https://graph.microsoft.com/",
							grant_type: "authorization_code",
						},
					},
					function (error, response, body) {
						// console.log(JSON.parse(body));
						fs.readFile(file, function (e, f) {
							request.put(
								{
									url:
										"https://graph.microsoft.com/v1.0/drive/root:/" +
										onedrive_folder +
										"/" +
										onedrive_filename +
										":/content",
									headers: {
										Authorization: "Bearer " + JSON.parse(body).access_token,
										"Content-Type": mime.getType(file),
									},
									body: f,
								},
								function (err, res, body) {
									console.log(body);
								}
							);
						});
					}
				);

				//res.download("Projekty.xlsx");
			});
		})
		.catch(() => res.status(401).json({ success: false }));
};

function getProjectUsers(projectId) {
	return req.epapi.projects.listProjectUsers(projectId).then((users) => {
		return users.memberships.membership.map((user) => {
			return {
				id: user.user._attributes.id,
				name: user.user._attributes.name,
			};
		});
	});
}

exports.timeSpent = async (req, res) => {
	const { params } = req.body;
	const itemsInBatch = 50;
	const batches = [];

	try {
		const data = [];

		if (params?.xproject_id) {
			const projectsIds = params.xproject_id.split("|");
			for (let i = 0; i < projectsIds.length; i += itemsInBatch) {
				batches.push(projectsIds.slice(i, i + itemsInBatch).join("|"));
			}
			delete params.xproject_id;

			for (batch of batches) {
				const result = await req.epapi.timeSpent.getTimeSpentPageJSON(100, {
					...params,
					xproject_id: batch,
				});
				data.push(...result);
			}
		} else {
			const result = await req.epapi.timeSpent.getTimeSpentPageJSON(100, {
				...params,
			});
			data.push(...result);
		}

		return res.status(200).send(data);
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

exports.getProjectTimeSpent = async (req, res) => {
	const { params } = req.body;

	try {
		const data = await req.epapi.timeSpent.getProjectTimeSpent(params["[xproject_id]"]);

		return res.status(200).send(data);
	} catch (error) {
		return res.status(403).send({ message: error.message });
	}
};

exports.getAllUsers = async (req, res) => {
	const { params } = req.body;
	const users = [];
	let page = 1;
	let returnedCount = 0;
	do {
		const data = await req.epapi.users.listUsersJSON(page, 100, {
			...params,
		});
		users.push(...data.aRes);
		returnedCount = data.aRes.length;
		page++;
	} while (returnedCount === 100);

	return res.send(users);
};

exports.updateTimeEntries = async (req, res) => {
	const { entries, dateTime, exportedMonth } = req.body;

	/*await Promise.all(
		entries.map(async (id) => {
			const body = `
		<time_entry>
			<easy_locked>0</easy_locked>
			<custom_fields type="array">
				<custom_field id="208">
					<value>${dateTime}</value>
				</custom_field>
				<custom_field id="229">
					<value>${exportedMonth}</value>
				</custom_field>
			</custom_fields>
		</time_entry>`;
			await updateTimeEntry({ id, body });
		})
	);*/
	const updateErrors = [];
	for (const id of entries) {
		const body = `
		<time_entry>
			<easy_locked>0</easy_locked>
			<custom_fields type="array">
				<custom_field id="208">
					<value>${dateTime}</value>
				</custom_field>
				<custom_field id="229">
					<value>${exportedMonth}</value>
				</custom_field>
			</custom_fields>
		</time_entry>`;

		try {
			await updateTimeEntry({ id, body });
		} catch (error) {
			updateErrors.push({ id, error: "Could not update time entry" });
		}
	}

	const lockErrors = await lockTimeEntries(entries);

	if (updateErrors.length || lockErrors.length) {
		return res
			.status(500)
			.json({ status: "error", errors: { ...updateErrors, ...lockErrors } });
	}

	return res.status(200).json({ status: "success", message: "Záznamy úspěšně upraveny" });
};

async function updateTimeEntry(data) {
	await req.epapi.timeSpent.updateTimeEntry(data);
}

async function lockTimeEntries(entries) {
	const body = `
		<time_entry>
			<easy_locked>1</easy_locked>
		</time_entry>`;

	/*return await Promise.all(
		entries.map(async (id) => {
			await updateTimeEntry({ id, body });
		})
	);*/
	const errors = [];
	for (const id of entries) {
		try {
			await updateTimeEntry({ id, body });
		} catch (error) {
			errors.push({ id, error: "Could not lock time entry" });
		}
	}

	return errors;
}

async function getTMPojectsRecords() {
	const projects = await req.epapi.projects.getAllProjectsJSON({ cf_80: "T%26M" });

	return await Promise.all(
		projects.map(async (project) => {
			try {
				return await req.epapi.timeSpent.getTimeSpentPageJSON(100, {
					project_id: project.id,
				});
			} catch (e) {
				console.log(e);
			}
		})
	);
}

exports.getExpectedRevenuesJSON = async (req, res) => {
	try {
		const expectedRevenues = await req.epapi.money.getExpectedRevenuesJSON();
		return res.send(expectedRevenues);
	} catch (error) {
		return res.send({ success: false, message: error.message });
	}
};

exports.getRealRevenuesJSON = async (req, res) => {
	try {
		const realRevenues = await req.epapi.money.getRealRevenuesJSON();
		return res.send(realRevenues);
	} catch (error) {
		return res.send({ success: false, message: error.message });
	}
};

exports.getCustomFieldById = async (req, res) => {
	const { id } = req.params;

	try {
		const customField = await req.epapi.customFields.getCustomFieldById(id);
		return res.status(200).send(customField);
	} catch (error) {
		return res.status(500).send({ message: error.message });
	}
};

exports.getProjectIssues = async (req, res) => {
	const { projectId } = req.params;
	const { params } = req.body;

	try {
		const issues = await req.epapi.issues.getProjectIssues(projectId, params);
		return res.status(200).send(issues);
	} catch (error) {
		console.log(error.message);
		return res.status(500).send("Could not retrieve any issues");
	}
};

exports.getCRMCases = async (req, res) => {
	const params = req.body;

	try {
		const crmCases = await req.epapi.crmCases.getCRMCases(params);
		return res.status(200).send(crmCases);
	} catch (error) {
		console.log(error.message);
		return res.status(500).send("Could not retrieve CRM cases");
	}
};

exports.getCRMCasesByProjectId = async (req, res) => {
	const { projectId } = req.params;
	const params = req.body;

	try {
		const crmCases = await req.epapi.crmCases.getCRMCasesByProjectId(projectId, params);
		return res.status(200).send(crmCases);
	} catch (error) {
		console.log(error.message);
		return res.status(500).send("Could not retrieve CRM cases");
	}
};

exports.getAttendances = async (req, res) => {
	const { params } = req.body;

	try {
		const attendances = await req.epapi.attendance.getAttendances(params);
		return res.status(200).send(attendances);
	} catch (error) {
		console.log(error.message);
		return res.status(500).send("Could not retrieve any CRM cases");
	}
};

exports.getProjectsFromDB = async (req, res) => {
	const { user, projects, year } = req.body;
	let where = [];
	let filterData = [];

	if (user) {
		where.push(`user_id = ANY($${where.length + 1}::int[])`);
		filterData.push([].concat(user));
	}
	if (year) {
		where.push(`year = $${where.length + 1}`);
		filterData.push(year);
	}
	if (projects) {
		where.push(`project_id = ANY($${where.length + 1}::int[])`);
		filterData.push([].concat(projects));
	}

	try {
		const data = await db.query(
			`SELECT * FROM projects${where.length ? " WHERE " : ""}${where.join(" AND ")}`,
			filterData
		);
		return res.status(200).send(data.rows);
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error retrieving projects from DB");
	}
};

exports.getAllProjectsBodyParams = async (req, res) => {
	const { params } = req.body;

	try {
		const projects = await req.epapi.projects.getAllProjectsJSON(params);
		return res.status(200).send(projects);
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error loading projects");
	}
};

exports.getIssues = async (req, res) => {
	const { params } = req.body;

	try {
		const issues = await req.epapi.issues.getIssues(params);
		return res.status(200).send(issues);
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error loading issues");
	}
};

exports.saveProjectsIntoDB = async (req, res) => {
	const { user, year, projects } = req.body;

	const data = projects.map((project) => {
		return [
			project.id,
			user,
			year,
			project.january,
			project.february,
			project.march,
			project.april,
			project.may,
			project.june,
			project.july,
			project.august,
			project.september,
			project.october,
			project.november,
			project.december,
		];
	});

	try {
		/*
		const response = await db.query(
			format(
				"INSERT INTO projects VALUES %L ON CONFLICT ON CONSTRAINT projects_pkey DO UPDATE projects as p SET january = c.january, february = c.february, march = c.march, april = c.april, may = c.may, june = c.june, july = c.july, august = c.august, september = c.september, october = c.october, november = c.nevember, december = c.december FROM (VALUES %L) as c(january, february, march, april, may, june, july, august, september, october, november, december) WHERE p.project_id = %L AND p.user_id = %L AND year = %L",
				data,data,
			)
		);*/
		const query = format(
			"INSERT INTO projects VALUES %L ON CONFLICT ON CONSTRAINT projects_pkey DO UPDATE SET january = EXCLUDED.january, february = EXCLUDED.february, march = EXCLUDED.march, april = EXCLUDED.april, may = EXCLUDED.may, june = EXCLUDED.june, july = EXCLUDED.july, august = EXCLUDED.august, september = EXCLUDED.september, october = EXCLUDED.october, november = EXCLUDED.november, december = EXCLUDED.december",
			data
		);
		await db.query(query);
		return res.status(200).send();
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error saving plans of projects into DB");
	}
};

exports.saveProjectUsersIntoDB = async (req, res) => {
	const { users, year, projectId } = req.body;

	const data = users.map((user) => {
		return [
			projectId,
			user.user_id,
			year,
			user.january,
			user.february,
			user.march,
			user.april,
			user.may,
			user.june,
			user.july,
			user.august,
			user.september,
			user.october,
			user.november,
			user.december,
		];
	});

	try {
		const query = format(
			"INSERT INTO projects VALUES %L ON CONFLICT ON CONSTRAINT projects_pkey DO UPDATE SET january = EXCLUDED.january, february = EXCLUDED.february, march = EXCLUDED.march, april = EXCLUDED.april, may = EXCLUDED.may, june = EXCLUDED.june, july = EXCLUDED.july, august = EXCLUDED.august, september = EXCLUDED.september, october = EXCLUDED.october, november = EXCLUDED.november, december = EXCLUDED.december",
			data
		);
		await db.query(query);
		return res.status(200).send();
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error saving project users into DB");
	}
};

exports.saveCrmProjectIssuesIntoDB = async (req, res) => {
	const { user, year, issues } = req.body;

	const data = issues.map((issue) => {
		return [
			issue.id,
			user,
			year,
			issue.january,
			issue.february,
			issue.march,
			issue.april,
			issue.may,
			issue.june,
			issue.july,
			issue.august,
			issue.september,
			issue.october,
			issue.november,
			issue.december,
		];
	});
	try {
		const query = format(
			"INSERT INTO crm VALUES %L ON CONFLICT ON CONSTRAINT crm_pkey DO UPDATE SET january = EXCLUDED.january, february = EXCLUDED.february, march = EXCLUDED.march, april = EXCLUDED.april, may = EXCLUDED.may, june = EXCLUDED.june, july = EXCLUDED.july, august = EXCLUDED.august, september = EXCLUDED.september, october = EXCLUDED.october, november = EXCLUDED.november, december = EXCLUDED.december",
			data
		);
		await db.query(query);
		return res.status(200).send();
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error saving plans of project issues into DB");
	}
};

exports.getCrmIssuesFromDB = async (req, res) => {
	const { user, issues, year } = req.body;
	let where = [];
	let filterData = [];

	if (user) {
		where.push(`assigned_to = ANY($${where.length + 1}::int[])`);
		filterData.push([].concat(user));
	}
	if (year) {
		where.push(`year = $${where.length + 1}`);
		filterData.push(year);
	}
	if (issues.length) {
		where.push(`issue_id = ANY($${where.length + 1}::int[])`);
		filterData.push(issues);
	}

	try {
		const data = await db.query(
			`SELECT * FROM crm${where.length ? " WHERE " : ""}${where.join(" AND ")}`,
			filterData
		);
		return res.status(200).send(data.rows);
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error retrieving crm issues from DB");
	}
};

exports.saveOpportunitiesIntoDB = async (req, res) => {
	const { user, opportunities, year } = req.body;

	const data = opportunities.map((opportunity) => {
		return [
			opportunity.opportunity_id ? opportunity.opportunity_id : uuidv4(),
			user,
			year,
			opportunity.name,
			opportunity.january,
			opportunity.february,
			opportunity.march,
			opportunity.april,
			opportunity.may,
			opportunity.june,
			opportunity.july,
			opportunity.august,
			opportunity.september,
			opportunity.october,
			opportunity.november,
			opportunity.december,
		];
	});
	try {
		const query = format(
			"INSERT INTO opportunities VALUES %L ON CONFLICT ON CONSTRAINT opportunities_pkey DO UPDATE SET name = EXCLUDED.name, january = EXCLUDED.january, february = EXCLUDED.february, march = EXCLUDED.march, april = EXCLUDED.april, may = EXCLUDED.may, june = EXCLUDED.june, july = EXCLUDED.july, august = EXCLUDED.august, september = EXCLUDED.september, october = EXCLUDED.october, november = EXCLUDED.november, december = EXCLUDED.december RETURNING *",
			data
		);
		const response = await db.query(query);
		return res.status(200).send(response.rows);
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error saving plans of opportunities into DB");
	}
};

exports.getOpportunitiesFromDB = async (req, res) => {
	const { user, year } = req.body;

	try {
		const data = await db.query(
			"SELECT * FROM opportunities WHERE user_id = $1 AND year = $2",
			[user, year]
		);
		return res.status(200).send(data.rows);
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error retrieving plans of opportunities from DB");
	}
};

exports.deleteOpportunityFromDB = async (req, res) => {
	const { opportunity_id } = req.body;

	try {
		const data = await db.query("DELETE FROM opportunities WHERE opportunity_id = $1", [
			opportunity_id,
		]);
		return res.status(200).send();
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error deleting plan of opportunities from DB");
	}
};

exports.getOffersFromDB = async (req, res) => {
	const { user, year } = req.body;
	let where = [];
	let filterData = [];

	if (user) {
		where.push(`user_id = ANY($${where.length + 1}::int[])`);
		filterData.push([].concat(user));
	}
	if (year) {
		where.push(`year = $${where.length + 1}`);
		filterData.push(year);
	}

	try {
		const data = await db.query(
			`SELECT * FROM offers${where.length ? " WHERE " : ""}${where.join(" AND ")}`,
			filterData
		);
		return res.status(200).send(data.rows);
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error retrieving offers from DB");
	}
};

exports.getUsersOffersPlansFromDB = async (req, res) => {
	const { offer_id, year } = req.body;
	let where = [];
	let filterData = [];

	where.push("offer_id = $1");
	filterData.push(offer_id);

	if (year) {
		where.push(`year = $${where.length + 1}`);
		filterData.push(year);
	}

	try {
		const data = await db.query(
			`SELECT * FROM offers${where.length ? " WHERE " : ""}${where.join(" AND ")}`,
			filterData
		);

		return res.status(200).send(data.rows);
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error retrieving users offers plans from DB");
	}
};

exports.getUsersInOfferFromDB = async (req, res) => {
	const { offer_id } = req.body;

	try {
		const data = await db.query(`SELECT * FROM users_in_offers WHERE offer_id = $1`, [
			offer_id,
		]);

		return res.status(200).send(data.rows);
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error retrieving users in offer from DB");
	}
};

exports.saveOffersIntoDB = async (req, res) => {
	const { user, offers, year } = req.body;

	const offersData = offers.map((offer) => {
		return [
			offer.offer_id,
			user,
			year,
			offer.january,
			offer.february,
			offer.march,
			offer.april,
			offer.may,
			offer.june,
			offer.july,
			offer.august,
			offer.september,
			offer.october,
			offer.november,
			offer.december,
		];
	});

	const usersInOffersData = offers
		.filter((offer) => {
			return (
				parseFloat(offer.january) ||
				parseFloat(offer.february) ||
				parseFloat(offer.march) ||
				parseFloat(offer.april) ||
				parseFloat(offer.may) ||
				parseFloat(offer.june) ||
				parseFloat(offer.july) ||
				parseFloat(offer.august) ||
				parseFloat(offer.september) ||
				parseFloat(offer.october) ||
				parseFloat(offer.november) ||
				parseFloat(offer.december)
			);
		})
		.map((offer) => [offer.offer_id, user]);

	try {
		const offersQuery = format(
			"INSERT INTO offers VALUES %L ON CONFLICT ON CONSTRAINT offers_pkey DO UPDATE SET january = EXCLUDED.january, february = EXCLUDED.february, march = EXCLUDED.march, april = EXCLUDED.april, may = EXCLUDED.may, june = EXCLUDED.june, july = EXCLUDED.july, august = EXCLUDED.august, september = EXCLUDED.september, october = EXCLUDED.october, november = EXCLUDED.november, december = EXCLUDED.december RETURNING *",
			offersData
		);
		const usersInOffersQuery = format(
			"INSERT INTO users_in_offers VALUES %L ON CONFLICT ON CONSTRAINT users_in_offers_pkey DO NOTHING",
			usersInOffersData
		);

		const [offersResponse] = await Promise.all([
			db.query(offersQuery),
			db.query(usersInOffersQuery),
		]);

		return res.status(200).send(offersResponse.rows);
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error saving offers into DB");
	}
};

exports.saveOfferUsersIntoDB = async (req, res) => {
	const { offerId, data } = req.body;
	let where = [];
	let filterData = [];
	const currentYear = new Date().getFullYear();

	const dataArray = data.map((item) => {
		return [offerId, item.user_id];
	});

	if (data.length) {
		where.push(`user_id NOT IN %L`);
		filterData.push(data.map((item) => item.user_id));
	}

	try {
		const usersInOffersQuery = format(
			`DELETE FROM users_in_offers WHERE offer_id = %L${
				where.length ? " AND " : ""
			}${where.join(" AND ")}`,
			offerId,
			filterData
		);

		const offersQuery = format(
			`DELETE FROM offers WHERE offer_id = %L AND year IN (%L)${
				where.length ? " AND " : ""
			}${where.join(" AND ")}`,
			offerId,
			[currentYear, currentYear + 1],
			filterData
		);

		await Promise.all([db.query(usersInOffersQuery), db.query(offersQuery)]);
	} catch (e) {
		console.error(e);
		return res.status(500).send("Error removing offer users from DB");
	}

	if (!data.length) return res.status(200).send();

	try {
		const query = format(
			"INSERT INTO users_in_offers VALUES %L ON CONFLICT ON CONSTRAINT users_in_offers_pkey DO NOTHING RETURNING *",
			dataArray
		);
		const response = await db.query(query);
		return res.status(200).send(response.rows);
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error saving offer users into DB");
	}
};

exports.saveOfferUsersPlnsIntoDB = async (req, res) => {
	const { users, year, offerId } = req.body;

	const data = users.map((user) => {
		return [
			offerId,
			user.user_id,
			year,
			user.january,
			user.february,
			user.march,
			user.april,
			user.may,
			user.june,
			user.july,
			user.august,
			user.september,
			user.october,
			user.november,
			user.december,
		];
	});

	try {
		const query = format(
			"INSERT INTO offers VALUES %L ON CONFLICT ON CONSTRAINT offers_pkey DO UPDATE SET january = EXCLUDED.january, february = EXCLUDED.february, march = EXCLUDED.march, april = EXCLUDED.april, may = EXCLUDED.may, june = EXCLUDED.june, july = EXCLUDED.july, august = EXCLUDED.august, september = EXCLUDED.september, october = EXCLUDED.october, november = EXCLUDED.november, december = EXCLUDED.december",
			data
		);
		await db.query(query);
		return res.status(200).send();
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error saving offer users plans into DB");
	}
};

exports.getContacts = async (req, res) => {
	const { params } = req.body;

	try {
		const contacts = await req.epapi.contacts.getContacts(params);
		return res.status(200).send(contacts);
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error loading contacts");
	}
};

exports.getCurrentUser = async (req, res) => {
	try {
		const user = await req.epapi.users.getUser(req.userId);
		return res.status(200).send(user);
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error loading contacts");
	}
};

exports.getProjectMembers = async (req, res) => {
	const { projectId } = req.body;

	try {
		const members = await req.epapi.members.getAllProjectMembers(projectId);
		return res.status(200).send(members);
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error loading project members");
	}
};

exports.getProjectTimeEntries = async (req, res) => {
	const { projectId, params } = req.body;

	try {
		const projectTimeEntries = await req.epapi.projects.getProjectTimeEntries(
			projectId,
			params
		);
		return res.status(200).send(projectTimeEntries);
	} catch (e) {
		console.log(e);
		return res.status(500).send("Error loading project time entries");
	}
};

exports.getWorkingTimeFromDB = async (req, res) => {
	const { user, year } = req.body;
	let where = [];
	let filterData = [];

	if (user) {
		where.push(`user_id = ANY($${where.length + 1}::int[])`);
		filterData.push([].concat(user));
	}
	if (year) {
		where.push(`year = $${where.length + 1}`);
		filterData.push(year);
	}

	try {
		const data = await db.query(
			`SELECT * FROM working_time${where.length ? " WHERE " : ""}${where.join(" AND ")}`,
			filterData
		);

		return res.status(200).send(data.rows);
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error retrieving working time from DB");
	}
};

exports.saveWorkingTimeIntoDB = async (req, res) => {
	const { user, year, workingTime } = req.body;

	const data = [
		user,
		year,
		workingTime.january,
		workingTime.february,
		workingTime.march,
		workingTime.april,
		workingTime.may,
		workingTime.june,
		workingTime.july,
		workingTime.august,
		workingTime.september,
		workingTime.october,
		workingTime.november,
		workingTime.december,
	];

	try {
		const query = format(
			"INSERT INTO working_time VALUES %L ON CONFLICT ON CONSTRAINT working_time_pkey DO UPDATE SET january = EXCLUDED.january, february = EXCLUDED.february, march = EXCLUDED.march, april = EXCLUDED.april, may = EXCLUDED.may, june = EXCLUDED.june, july = EXCLUDED.july, august = EXCLUDED.august, september = EXCLUDED.september, october = EXCLUDED.october, november = EXCLUDED.november, december = EXCLUDED.december RETURNING *",
			[data]
		);
		const response = await db.query(query);
		return res.status(200).send(response.rows);
	} catch (err) {
		console.log(err);
		return res.status(500).send("Error saving working time into DB");
	}
};
