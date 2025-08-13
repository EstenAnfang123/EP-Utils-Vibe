const moment = require("moment-business-time");
const config = require("../../config");

const report = {
	issueReportTime: async (issueDetail) => {
		//konfigurace pracovnich hodin a statnich svatku
		_prvUtil.configureMoment();
		const status2 = issueDetail.issue.created_on;
		// const ret = await _prvUtil.getStatusDates(issueDetail,10);

		const oRet = {
			prevzeti: "",
			vyreseni: "",
			util: {
				"id":issueDetail.issue.id,
				locale: moment.locale(),
				vytvoreno: status2,
				prirazeno: await _prvUtil.getStatusDates(issueDetail,6),
				vReseni: await _prvUtil.getStatusDates(issueDetail,3),
				predano: await _prvUtil.getStatusDates(issueDetail,10),
				vraceno: await _prvUtil.getStatusDates(issueDetail,8),
				SLA: {},
				statusUpdates: await _prvUtil.getStatusUpdates(issueDetail)
			}
		};



		//console.log(`latest: ${_prvUtil.getLatestDate(oRet.predano)}`);

		//dopocitani SLA
		oRet.util.SLA = {
			"prevzeti": _prvUtil.calculateSLAPrirazeno(oRet.util.vytvoreno,oRet.util.prirazeno),
			"vyreseni": _prvUtil.calculateSLAVyreseno(oRet.util.statusUpdates)
		};

		//vysledek hodime uplne nahoru
		oRet.prevzeti = oRet.util.SLA.prevzeti.hodnota.neat;
		oRet.vyreseni = oRet.util.SLA.vyreseni.celkem.neat;
		return oRet;
	}
};

const _prvUtil = {
	calculateSLAVyreseno: (updates) => {
		//let vytvoreno, vReseni, predano, vraceno;
		//const {vytvoreno, vReseni, predano, vraceno} = dates;
		//console.log(`vytv: ${vytvoreno} \nv reseni ${vReseni} \npredano ${predano} \nvraceno ${vraceno}`);
		let opravy;
		try {
			opravy = updates.filter(item => item.old == 8 && item.new == 10).map(item => item.diff).reduce( (acc,prev) => acc.diff + prev.diff );
		} catch (err) {
			opravy = _prvUtil.calculateTimeDiff({hour:0},{hour:0});
		}
		
		const oRet = {
			reseni: //updates.filter(item => item.old != 8 && item.new == 10).map(item => item.diff).reduce( (acc,prev) => acc + prev ),
				_prvUtil.calculateTimeDiff(updates.filter(item => item.old != 8 && item.new == 10).map(item => item.date)[0],
					updates.filter(item => item.old == 0).map(item => item.date)[0]),
			
			opravy: opravy,
			celkem: 0
		};

		const tmp = oRet.reseni.raw + oRet.opravy.raw;
		oRet.celkem = {raw: tmp, neat: _prvUtil.formatTime(tmp)};
		return oRet;
	},

	calculateSLAPrirazeno: (datesVytvoreno, datesPrirazeno) => {
		const vytvoreno = _prvUtil.getLatestDate(datesVytvoreno);
		const prirazeno = _prvUtil.getLatestDate(datesPrirazeno);
		const diff = _prvUtil.calculateTimeDiff(prirazeno,vytvoreno);
		return {
			"hodnota": diff,
			"vytvoreno": vytvoreno,
			"prirazeno": prirazeno
		};
	},
	
	getLatestDate: (aDate) => {
		if (Array.isArray(aDate)) {
			const aMoments = aDate.map(item => moment(item));
			return moment.max(aMoments);
		} else {
			return aDate;
		}
	},

	calculateTimeDiff: (from,to) => {
		const valHours = moment(from).workingDiff(moment(to),"hour",true);
		// const valSec = moment(from).workingDiff(moment(to),'second',true);
		// //const momentVal = moment({hour:val});
		// const hours = Math.floor(valSec / 3600);
		// const minutes = Math.floor((valSec - ( hours * 3600 )) / 60);
		// const seconds = valSec - ( hours * 3600) - ( minutes * 60 );
		return {raw: +valHours.toFixed(2),
			neat: _prvUtil.formatTime(valHours)};
	},

	formatTime: (hours,twoPlaces=false) => {
		const valSec = hours * 3600;
		let hour = Math.floor(valSec / 3600);
		let minute = Math.floor((valSec - ( hour * 3600 )) / 60);
		let second = valSec - ( hour * 3600) - ( minute * 60 );
		second = Math.trunc(second);
		if (twoPlaces) {
			hour = hour < 10 ? `0${hour}` : hour;
			minute = minute < 10 ? `0${minute}` : minute;
			second = second < 10 ? `0${second}` : second;
		}
		return `${hour}h ${minute}m ${second}s`;
	},

	configureMoment: () => {
		// const locale = moment.locale("cs");
		moment.updateLocale("cs", {
			workinghours: config.moment.workinghours,
			holidays: config.moment.holidays
		}
		);
		moment().utcOffset(60);
		console.log("Moment.js locale je nakonfigurovano...");
	},
	/*
		Vrati pole journal z objektu issue
	*/
	getJournals: async (issueDetail) => {
		return issueDetail.issue.journals.journal;
	},

	/*
		Vrati pole se journal zaznamy, ktere skoncili v danem statuse
	*/
	getStatusDates: async (issueDetail,statusId) => {
		const aJournals = await _prvUtil.getJournals(issueDetail);
		const aStatusJournals = aJournals
			.map( item => ({ ...item,"new_status":_prvUtil.journalGetStatusData(item).new}))
			.filter(item => item.new_status == statusId);
		return aStatusJournals.map(item => item.created_on);
	},

	/*
	* Vrati true pokud je v danem journalu zmena statusu
	*/
	journalIsStatusRelevant: (oJournal) => {
		//kontrola jestli existuje detail s atributem status_id
		return Array.isArray(oJournal.details.detail) ?
			(oJournal.details.detail.filter(item => item._attributes.name == "status_id")[0].length > 0) :
			false;
	},

	getStatusUpdates: async (issue) => {
		const aJournals = await _prvUtil.getJournals(issue);
		aJournals.unshift(_prvUtil.createFakeJournal(issue.issue.created_on));		
		const aUpdates = aJournals
			.map(item => _prvUtil.journalGetStatusData(item)) //vytahnuti old, new date jid do objektu
			.filter(item => item) 							  //vyhazeni nestatusovych journalu
			.map((item,idx) => ({...item,index:idx}) ) 		  //doplneni poradi (idx)
		;
		const aRet = [];
		for (let i = 0; i < aUpdates.length; i++) {
			let timeDiff;
			if (i == 0) {
				timeDiff = 0;
			} else {
				timeDiff = _prvUtil.calculateTimeDiff(aUpdates[i].date,aUpdates[i-1].date);
			}
			aRet.push({...aUpdates[i],diff:timeDiff});
		}
		//const aRet = aUpdates;
		return aRet;
	},

	/*
		Pokud dany journal obsahuje zmenu statusu, tak vrati objekt {novy,stary} status - jinak vrati false
	*/
	journalGetStatusData: (oJournal) => {
		const oDetail = oJournal.details.detail;
		const oDetailNorm = _prvUtil.normalizeDetail(oDetail);
		try {
			const stat = oDetailNorm.filter(item => item._attributes.name == "status_id");
			return stat.length > 0 ? {"old":stat[0].old_value, "new":stat[0].new_value, date: oJournal.created_on, jid: oJournal._attributes.id } : false;
		} catch (err) {
			return false;
		}
	},

	createFakeJournal: (dateCreated, oldStat=0, newStat=2) => {
		const oRet = {
			created_on: dateCreated,
			_attributes: {
				id: 0
			},
			details: {
				detail: [
					{
						_attributes: {
							name: "status_id"
						},
						old_value: oldStat,
						new_value: newStat
					}
				]
			}
		};
		return oRet;
	},

	// createStatusHistory: (aStatusUpdates, )

	normalizeDetail: (oDetail) => {
		if (Array.isArray(oDetail)) {
			return oDetail;
		} else {
			// return oDetail == undefined
			return Array.of(oDetail);
		}
	}
};

module.exports = report;
