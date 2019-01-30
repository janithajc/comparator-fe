
CREATE OR REPLACE FUNCTION identifydatatype (data1 varchar(100),data2 varchar(100))
RETURNS varchar AS $dtype$
declare
	dtype varchar(100);
BEGIN
   SELECT (CASE 
	WHEN data1 ~ '^-?[0-9]+$' AND data2 ~ '^-?[0-9]+$'  THEN 'INT'
    WHEN data1 ~ '^[+-]?([0-9]*[.])[0-9]$' AND data2 ~ '^-?[0-9]+$'  THEN 'INT'
    WHEN data1 ~ '^-?[0-9]+$' AND data2 ~ '^[+-]?([0-9]*[.])[0-9]$'  THEN 'INT'
    WHEN data1 ~ '^-?[0-9]+$' AND data2 ~ '^[+-]?([0-9]*[.])?[0-9]+$'  THEN 'INT'
    WHEN data1 ~ '^[+-]?([0-9]*[.])[0-9]$' AND data2 ~ '^[+-]?([0-9]*[.])[0-9]$'  THEN 'OD'
    WHEN data1 ~ '^[+-]?([0-9]*[.])?[0-9]+$' AND data2 ~  '^-?[0-9]+$' THEN 'INT'
    WHEN data1 ~ '^[+-]?([0-9]*[.])?[0-9]+$' AND data2 ~  '^[+-]?([0-9]*[.])?[0-9]+$' THEN 'DE'
    WHEN data1 ~ '^[+-]?([0-9]*[.])?[0-9]+$' AND data2 ~  '^[+-]?([0-9]*[.])[0-9]$' THEN 'OD'
    WHEN data1 ~ '^[+-]?([0-9]*[.])[0-9]$' AND data2 ~  '^[+-]?([0-9]*[.])?[0-9]+$' THEN 'OD'
	ELSE 'STR'
END) into dtype;
   RETURN dtype;
END;
$dtype$ LANGUAGE plpgsql;
