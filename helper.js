var mysql = require('mysql');

function get_all_sensor_data(conn, date) {
    var start = "2019-10-06" + " 00:00:00";
    var end = "2019-10-06" + " 23:59:59";
    console.log(start + " - " + end);
    conn.connect(function (err) {
        var sql = "SELECT * FROM sensor_datas where time BETWEEN '" + start + "' AND '" + end +"'";
        //console.log(sql);
        conn.query(sql, function (err, results, fields) {
            if (err) throw err;
            if (results) {
                 console.log('1');
                // for(var i=0; i<results.length; i++) {
                //     console.log(results[i]['humid']);
                // }
                return results;
            }
        });
    });
}

function yyyymmdd(now) {
    //var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var d = now.getDate();
    var mm = m < 10 ? '0' + m : m;
    var dd = d < 10 ? '0' + d : d;
    return '' + y +'-'+ mm+'-' + dd;
}

module.exports = {
    get_all_sensor_data: get_all_sensor_data,
    yyyymmdd: yyyymmdd
}