const fs = require('fs');
const util = require('util');
const os = require('os');
const path = require('path');
const cluster = require('cluster');
var _ = require('underscore');


const LOG_FILE_CEATE_INTERVAL = 1000 * 60 * 5 ; //  5 mins
let quotaBenchmarkLogFile = '';
let isInitDone = false;
let outputDir = '/Users/yogeshgaonkar/EMG/Quota_testing/benchmark_logs/test/';
const logPrefixes = ['applying quota check:Bucket=','count=','expires=','allow=','isAllowed=','statusCode=','weight_sent=','remoteCount=','remoteExpiry=',
'remote_exceeded=','"','"','remote_available=','debugMpId=','remote_timestamp=','respTime='];

let counter=0;
const fileNamesSuffix = ['Quota60','Quota600','Quota3000','Quota6000'];

const csv_header = "Time,Timestamp,ProcessId,Bucket,Local+Remote,Bucket Expires,Allow,Success,Status Code,Weight Applied, Remote Count,Remote Expiry,Remote Exceeded,Remote Available,DebugMpId,Remote Timestamp,Apply Response Time"+os.EOL;

const _calculateLogFilePath = () => {
    let suffix = fileNamesSuffix[counter] || (counter+1)
    var d = new Date()
    var logDate = d.getHours()+'-'+d.getMinutes()+'-'+d.getDate()+'-'+d.getMonth()+'-'+d.getFullYear()+'_'+suffix;
    counter++;
    const baseFileName =  util.format('emg-quota-logs-%s-%s.csv', os.hostname(), logDate);
    const logFilePath = path.join(outputDir, baseFileName);
    return logFilePath;
};

const initBenchmarkLogging = function(dirPath) {
    if ( dirPath ) {
        outputDir = dirPath;
    }
    quotaBenchmarkLogFile = _calculateLogFilePath();
    addHeaderToFile();
    setInterval(function(){
        quotaBenchmarkLogFile = _calculateLogFilePath();
        addHeaderToFile();
    },LOG_FILE_CEATE_INTERVAL);

    isInitDone = true;
}

const addHeaderToFile = () => {
    fs.readFile(quotaBenchmarkLogFile, {encoding: 'utf-8'}, function(err,data){
        if (( err && err.message.includes('no such file or directory') ) || data.length === 0 ) {
            fs.appendFile(quotaBenchmarkLogFile, csv_header , function (err) {
                if (err) console.log(err);
            });
        }
    });
}

const writelogToFile = function(data) {
    let dataStr = JSON.stringify(data);
    if (!dataStr.includes('applying quota check') ) {
        return;
    }
    logPrefixes.forEach( prefix => {
        dataStr=dataStr.replace(prefix,'');
    });

    let ProcessId = '';
    if (cluster.isMaster) {
      ProcessId = process.pid;
    } else if (cluster.isWorker) {
      ProcessId = cluster.worker.id;
    }
    const Time = _.now();
    const Timestamp = new Date().toISOString();
    const record = Time+','+Timestamp+','+ProcessId+','+dataStr+os.EOL;


    if (!isInitDone) {
        initBenchmarkLogging();
        setTimeout(()=>{
            fs.appendFile(quotaBenchmarkLogFile, record , function (err) {
                if (err) console.log(err);
            });
        },50)
    } else {
        fs.appendFile(quotaBenchmarkLogFile, record , function (err) {
            if (err) console.log(err);
        });
    }
}


const stop = function(data) {
  // TBD
}

module.exports.init = initBenchmarkLogging;
module.exports.logBenchmark = writelogToFile;
