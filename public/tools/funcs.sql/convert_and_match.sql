CREATE OR REPLACE FUNCTION convertData (data_1 VARCHAR(100),data_2 VARCHAR(100),to_type VARCHAR(5)) RETURNS VARCHAR
AS
$outVar$ DECLARE outVar VARCHAR(100);

data1Number DECIMAL(20,5);

data2Number DECIMAL(20,5);

BEGIN
SELECT (CASE WHEN to_type IN ('INT','OD','DE') THEN CAST(data_1 AS DECIMAL(20,5)) END) INTO data1Number;
SELECT (CASE WHEN to_type IN ('INT','OD','DE') THEN CAST(data_2 AS DECIMAL(20,5)) END) INTO data2Number;
SELECT (CASE WHEN to_type IN ('INT','OD','DE') THEN CAST(data_1 AS DECIMAL(20,5)) END) INTO data1Number;
SELECT (CASE WHEN to_type = 'INT' THEN ROUND(data1Number) WHEN to_type = 'OD' THEN ROUND(data1Number,1) WHEN to_type = 'DE' THEN ROUND(data1Number,2) ELSE -999999999999999.99999 END) INTO data1Number;
SELECT (CASE WHEN to_type = 'INT' THEN ROUND(data2Number) WHEN to_type = 'OD' THEN ROUND(data2Number,1) WHEN to_type = 'DE' THEN ROUND(data2Number,2) ELSE -999999999999999.99998 END) INTO data2Number;
SELECT (CASE WHEN data_1 = data_2 THEN 'MATCH' WHEN data1Number = data2Number THEN 'SMATCH' ELSE 'DMATCH' END) INTO outVar;
RETURN outVar;
END;$outVar$ LANGUAGE plpgsql;
