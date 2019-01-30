CREATE OR REPLACE FUNCTION compareData (data1 varchar(100), data2 varchar(100)) 
RETURNS VARCHAR AS $outVar$ 
DECLARE outVar varchar(10);
        dataType varchar(10);

BEGIN
SELECT identifyDataType(data1,data2) INTO dataType;
SELECT (CASE
   WHEN data1=data2 THEN 'MATCH'
   WHEN (data1 IS NULL AND data2 IS NULL) THEN 'MATCH'
   WHEN (data1 IS NULL OR data2 IS NULL) THEN 'DMATCH'
   WHEN dataType IN ('INT','OD','DE') THEN convertData(data1,data2,dataType)
   WHEN data1!=data2 THEN 'DMATCH'
   ELSE 'ERROR'
   END) INTO outVar;
RETURN outVar;
END;$outVar$ LANGUAGE plpgsql;