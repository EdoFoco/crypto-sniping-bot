class Logger{
    
    constructor (logLevel, workerNo) {
        // 1. Debug
        // 2. Info
        // 3. Warning
        // 4. Critical 
        this.logLevel = logLevel;
        this.workerNo = workerNo;
    }

    log(level, message) { 
        if(level >= this.logLevel){
            message = { 'worker': this.workerNo, 'message': message, 'timestamp': new Date().toISOString() };
            console.log(message);
        }
    }
}

module.exports = Logger;