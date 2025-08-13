exports.customFields = {
	odberatel: { id: "70", par1: "name", par2: "_text" },
	odberatel_er: {
		id: "73",
		par1: "name",
		par2: "_text",
		missing: "Chybí",
	},
	dodavatel: { id: "67", par1: "name", par2: "_text" },
	dodavatel_ee: { id: "76", par1: "name", par2: "_text" },
	objednavka: { id: "72", par1: "value", par2: "_text" },
	objednavka_dod: { id: "69", par1: "value", par2: "_text" },
	objednavka_er: { id: "75", par1: "value", par2: "_text" },
	objednavka_ee: { id: "77", par1: "value", par2: "_text" },
	faktura: { id: "71", par1: "value", par2: "_text" },
	faktura_dod: { id: "68", par1: "value", par2: "_text" },
	konecnyZakaznik: { id: "35", par1: "name" /* par2: "_text" */ },
	TMFIX: { id: "80", par1: "value" /* par2: "_text" */ },
	manazerProjektu: { id: "113", par1: "value" },
	castka_eso: { id: "151", par1: "value" },
	majitel_projektu: { id: "23", par1: "value" },
};

exports.customFieldsDb = {
	odberatel: {
		id: "70",
		par1: "name",
		par2: "",
		obj: "RR",
		field: "partner",
	},
	odberatel_er: {
		id: "73",
		par1: "name",
		par2: "",
		obj: "ER",
		field: "parntner",
		missing: "Chybí",
	},
	dodavatel: {
		id: "67",
		par1: "name",
		par2: "",
		obj: "RE",
		field: "partner",
	},
	dodavatel_ee: {
		id: "76",
		par1: "name",
		par2: "",
		obj: "EE",
		field: "partner",
	},
	objednavka: {
		id: "72",
		par1: "value",
		par2: "",
		obj: "RR",
		field: "objednavka",
	},
	objednavka_dod: {
		id: "69",
		par1: "value",
		par2: "",
		obj: "RE",
		field: "objednavka",
	},
	objednavka_er: {
		id: "75",
		par1: "value",
		par2: "",
		obj: "ER",
		field: "objednavka",
	},
	objednavka_ee: {
		id: "77",
		par1: "value",
		par2: "",
		obj: "EE",
		field: "objednavka",
	},
	faktura: {
		id: "71",
		par1: "value",
		par2: "",
		obj: "RR",
		field: "faktura",
	},
	faktura_dod: {
		id: "68",
		par1: "value",
		par2: "",
		obj: "RE",
		field: "faktura",
	},
	konecnyZakaznik: {
		id: "35",
		par1: "name",
		par2: "",
		obj: "PR",
		field: "partner",
	},

	TMFIX: {
		id: "80",
		par1: "value",
		par2: "",
		obj: "PR",
		field: "tmfix",
	},
	manazerProjektu: {
		id: "113",
		par1: "",
		obj: "PR",
		field: "manazer",
	},
};

exports.aExcludedPrjId = [
	427, //	EFFIIS: Nepřítomnost
];

exports.css = {
	error: "error",

	warning: "warning",

	normal: "normal",

	billed: "billed",
};

exports.eso = {
	filenames: ["ESO9_EXPORT_XML_ZAK_443.XML"],
};
