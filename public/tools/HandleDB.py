#https://www.unixmen.com/installing-scanning-clamav-ubuntu-14-04-linux/
from sqlalchemy.schema import CreateColumn
from sqlalchemy.ext.compiler import compiles
from sqlalchemy import Table, MetaData, create_engine
from sqlalchemy.types import String
import pandas as pd
import time
import psycopg2
import csv
import sys
import multiprocessing as mp
import os
import configparser
import random
import pymysql
### IMPORT CUSTOM LIBS
try:
    from write_factory import *
except:
    import inspect
    currentdir = os.path.dirname(os.path.abspath(inspect.getfile(inspect.currentframe())))
    parentdir = os.path.dirname(currentdir)
    sys.path.insert(0, parentdir)
    from write_factory import *

mode = sys.argv[1]
file_1_path = sys.argv[2] #'/home/nithilar/Project/Sysco/MSRUtils/PycharmProjects/DataValidate/dataSet/NewColDefect/01/MSR.csv'
file_2_path = sys.argv[3] #'/home/nithilar/Project/Sysco/MSRUtils/PycharmProjects/DataValidate/dataSet/NewColDefect/01/SEED.csv'
map_file_path = sys.argv[4]+".csv" #"/home/nithilar/Project/Sysco/MSRUtils/PycharmProjects/DataValidate/dataSet/NewColDefect/01/map.csv.csv"
out_put_file_name = sys.argv[5]#"file_nm.xlsx"
if len(sys.argv)==7:
    pks=(sys.argv[6].replace("%","_pct")).split(",")
else:
    pks=[]
#["invoice_nbr","item_nbr"]
if len(sys.argv)==8:
    config_path = sys.argv[7]
else:
    config_path ="/home/janitha/Documents/Projects/comparison-fe/public/tools/compariosn.config"
print "OUTPUT FILE ",out_put_file_name
print "RUN AS ",mode
#### REMOVING <SPACE CHARACTER> IN CSV HEADER. ####
copy_csv_file_with_header_manipulation(file_1_path)
copy_csv_file_with_header_manipulation(file_2_path)


config = configparser.ConfigParser()
config.read(config_path)

db_creds={"database":config['POSTGRESDB']['postrgres_db'],
"user":config['POSTGRESDB']['postrgres_user'],
"password":config['POSTGRESDB']['postrgres_pwd'],
"port":config['POSTGRESDB']['postrgres_port'],
"host":config['POSTGRESDB']['postrgres_host']
}

db_creds_mysql={"database":str(config['MYSQLDB']['mysql_db']),
"user":str(config['MYSQLDB']['mysql_user']),
"password":str(config['MYSQLDB']['mysql_pwd']),
"port":int(config['MYSQLDB']['mysql_port']),
"host":str(config['MYSQLDB']['mysql_host'])
}


#file_1_path = 'src_1.csv'
#file_2_path = 'src_2.csv'
#map_file_path = "map.csv"


hash_prefix=''.join([random.choice('abcdefghijklmno') for _ in range(3)]).lower()
print "Hash Prefix for this job:- ",hash_prefix
left_table_db_name= "{0}lefttable".format(hash_prefix)
right_table_db_name ="{0}righttable".format(hash_prefix)

colourCode={
    "MATCH": "00ff00",
    "SMATCH": "ffff00",
    "DMATCH": "ff0000",
    "Headers": "D3D3D3",
    "PreviouslyKnownMismatched": "F5AE14",
    "FoundInOneFile": "C39BD3",
    "FoundInTwoFile": "168FC9",
    "ERROR":"93680c",
    "HcollidedOneFile":"D35400",
    "HcollidedTwoFile":"FF00FF"
}
    
colourCodeDesc={
    "MATCH": "MATCH records in both files",
    "SMATCH": "Slightly MATCH records in both files",
    "DMATCH": "MisMatched records in both files",
    "Headers": "Headers",
    "PreviouslyKnownMismatched": "MisMatched records in both files which is known",
    "FoundInOneFile": "Cells (rows) which are only found in 1010",
    "FoundInTwoFile":"Cells (rows) which are only found in SEED",
    "HcollidedOneFile":"Hash collided records in file 1",
    "HcollidedTwoFile":"Hash collided records in file 2",
    "ERROR":"COMPARISON TOOL ERROR"
}

class ColumnMap:
    def __init__(self,l_file,r_file,common_keys,map_file,left_table_db_name,right_table_db_name):
        self.l_file=l_file
        self.r_file=r_file
        self.map_file=map_file
        self.common_p_keys=common_keys
        self.out_put_header=[]
        self.l_to_r={}
        self.r_to_l={}
        self.left_table_db_name=left_table_db_name
        self.right_table_db_name=right_table_db_name

    def generate_mapping_file(self,mapping_file_path,db_creds_mysql):
        h_set_01 = self.get_column_names_from_csv(self.l_file)
        h_set_02 = self.get_column_names_from_csv(self.r_file)
        common_h = list(set(h_set_02).intersection(set(h_set_01)))
        uncommon_h_01 = list(set(h_set_01).difference(set(h_set_02)))
        uncommon_h_02 =list(set(h_set_02).difference(set(h_set_01)))
        with open(mapping_file_path,"w") as f:
            f.write("{0},{1}\n".format(self.l_file,self.r_file))
            for i in common_h:
                f.write("{0},{1}\n".format(i,i))
            for i in uncommon_h_01:
                f.write("{0},\n".format(i))
            for i in uncommon_h_02:
                f.write(",{0}\n".format(i))
            f.write("--REMOVE THIS--,--REMOVE THIS--\n")
            maps_from_repo = self.get_map_file_from_backup_table(uncommon_h_01,uncommon_h_02,db_creds_mysql["host"],db_creds_mysql["port"],db_creds_mysql["user"],db_creds_mysql["password"],db_creds_mysql["database"])
            for i in maps_from_repo:
                f.write("{0},{1}\n".format(i["file1_name"],i["file2_name"]))
            maps_from_repo = self.get_map_file_from_backup_table(uncommon_h_02,uncommon_h_01,db_creds_mysql["host"],db_creds_mysql["port"],db_creds_mysql["user"],db_creds_mysql["password"],db_creds_mysql["database"])
            for i in maps_from_repo:
                f.write("{0},{1}\n".format(i["file1_name"],i["file2_name"]))

    def get_column_names_from_table(self,table_name,db_creds):
        with psycopg2.connect(database=db_creds["database"],
                                        user=db_creds["user"],
                                        password=db_creds["password"],
                                        port=db_creds["port"],
                                        host=db_creds["host"]) as connection:
            with connection.cursor() as cursor:
                cursor.execute("select column_name from information_schema.columns where table_schema = 'public' and table_name='{0}'".format(table_name))
                column_names = [row[0] for row in cursor]
                column_names.remove('index')
                return column_names

    def get_column_names_from_csv(self,file_name):
        return pd.read_csv(file_name, nrows=0).columns.tolist()
    
    def identify_table_from_column_list(self,column_list,left_table_db_name,right_table_db_name):
        left_tables_cols = self.get_column_names_from_table(left_table_db_name,db_creds)
        right_tables_cols = self.get_column_names_from_table(right_table_db_name,db_creds)
        is_in_left = list(set(column_list).difference(set(left_tables_cols)))==[]
        is_in_right = list(set(column_list).difference(set(right_tables_cols)))==[]
        if( is_in_left and is_in_right):
            return "both"
        elif(is_in_right):
            return "right"
        elif( is_in_left):
            return "left"
        else:
            return None
            
    def read_map_file(self):
        map_header = self.get_column_names_from_csv(self.map_file)
        rows =[]
        with open(self.map_file) as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        map_file_1st_column=[i[map_header[0]] for i in rows]
        map_file_2nd_column=[i[map_header[1]] for i in rows]
        compare_result_map_col_1 = self.identify_table_from_column_list(map_file_1st_column,self.left_table_db_name,self.right_table_db_name)
        compare_result_map_col_2 = self.identify_table_from_column_list(map_file_2nd_column,self.left_table_db_name,self.right_table_db_name)
        if compare_result_map_col_1 == "both" and compare_result_map_col_2 == "both":
            mapfiles_lefttable_represent_key = map_header[0]
            mapfiles_righttable_represent_key = map_header[1]
        elif compare_result_map_col_1 == "right" and compare_result_map_col_2 == "left" :
            mapfiles_lefttable_represent_key = map_header[1]
            mapfiles_righttable_represent_key = map_header[0]
        elif compare_result_map_col_1 == "left" and compare_result_map_col_2 == "right" :
            mapfiles_lefttable_represent_key = map_header[0]
            mapfiles_righttable_represent_key = map_header[1]
        else:
            raise Exception("TABLES AND MAP FILES ARE NOT SAME")
        for i in rows:
            self.l_to_r[i[mapfiles_lefttable_represent_key]]=i[mapfiles_righttable_represent_key]
            self.r_to_l[i[mapfiles_righttable_represent_key]]=i[mapfiles_lefttable_represent_key]
    
    def get_mapped_column_for(self,column_name,to_table=None,from_table=None):
        if to_table=="rg" and column_name in self.l_to_r:
            return self.l_to_r[column_name]
        elif to_table=="lf" and column_name in self.r_to_l:
            return self.r_to_l[column_name]
        elif to_table is None and column_name in self.l_to_r:
            return self.l_to_r[column_name]
        elif to_table is None and column_name in self.r_to_l:
            return self.r_to_l[column_name]
        elif column_name in self.l_to_r:
            return column_name
        elif column_name in self.r_to_l:
            return column_name
        else:
            return None
    
    def get_refrence_columns_for_output(self):
        out_put_list=[]
        for i in self.common_p_keys:
            out_put_list.append(self.get_mapped_column_for(i,"lf"))
        return out_put_list+[j for j in self.l_to_r.keys() if j not in out_put_list]
    
    def backup_map_file(self,host_url,port_no,user_name,password,db_name):
        print host_url,port_no,user_name,password,db_name
        con = pymysql.connect(host = host_url, port = port_no, user = user_name, passwd = password, db = db_name)
        cursor = con.cursor()
        for i in self.l_to_r.keys():
            cursor.execute("INSERT IGNORE INTO maprepo (file1_name,file2_name,task_id) VALUES (%s,%s,%s)", (i,self.l_to_r[i],hash_prefix))
        con.commit()
        con.close()
    
    def get_map_file_from_backup_table(self,col_1_list,col_2_list,host_url,port_no,user_name,password,db_name):
        con = pymysql.connect(host = host_url, port = port_no, user = user_name, passwd = password, db = db_name,cursorclass=pymysql.cursors.DictCursor)
        cursor = con.cursor()
        map_out=[]
        cursor.execute("SELECT * from maprepo where file1_name in %s and file2_name in %s",(col_1_list,col_2_list))
        map_out = cursor.fetchall()
        con.commit()
        con.close()
        return map_out
        
        

def init_legend_reord(column_list):
        global colourCode
        temp_col_key={}
        for i in colourCode.keys():
            temp_col_key[i]=0
        legend_recorder={}
        for i in column_list:
            legend_recorder[i]=dict(temp_col_key)
        return legend_recorder

def read_and_store_db(table_name,file_name,con_string):
    s = time.time()
    df = pd.read_csv(file_name, sep=',', index_col=False, usecols=None, squeeze=False,  dtype=str)
    engine = create_engine(con_string)
    dff = df.add_prefix('"')
    dff = df.add_suffix('"')
    df.to_sql(table_name, con=engine,dtype={col_name: String for col_name in df})
    print "Complete loading {2} Table {0} File {1}".format(table_name,file_name,(time.time()-s))

def generate_select_query_for_fetch_data(refrence_column_list,columnMap,left_table_db_name,right_table_db_name):
    a_select_statement_for_a_column="lt.\"{0}\" \"lt{0}\",compareData(lt.\"{0}\",rg.\"{1}\"),rg.\"{1}\" \"rg{1}\""
    full_select_list=[]
    for i in refrence_column_list:
        full_select_list.append(a_select_statement_for_a_column.format(columnMap.get_mapped_column_for(i,"lf"),columnMap.get_mapped_column_for(i,"rg")))
    select_section = ','.join(full_select_list)
    return "select {0} from {1} lt join {2} rg on lt.primaryHash=rg.primaryHash where lt.primaryHash IN (SELECT lt.primaryHash FROM {1} lt JOIN {2} rg ON lt.primaryHash = rg.primaryHash group by lt.primaryHash having count(lt.primaryHash) =1)".format(select_section,left_table_db_name,right_table_db_name)

def generate_hash_collide_detection_query(reference_column_list,ColumnMap,is_left_table,left_table_db_name,right_table_db_name):
    table_key =""
    table_name = ""
    if is_left_table:
        table_key="lf"
        table_name =left_table_db_name
    else:
        table_key="rg"
        table_name =right_table_db_name
    full_select_list=[]
    for i in reference_column_list:
        full_select_list.append("\""+columnMap.get_mapped_column_for(i,table_key)+"\"")
    select_section = ','.join(full_select_list)
    return "select {0} from {1} where primaryHash IN (SELECT lt.primaryHash FROM {2} lt JOIN {3} rg ON lt.primaryHash = rg.primaryHash group by lt.primaryHash having count(lt.primaryHash) >1)".format(select_section,table_name,left_table_db_name,right_table_db_name)

def generate_hash_mis_detection_query(reference_column_list,ColumnMap,is_left_table,left_table_db_name,right_table_db_name):
    table_key =""
    table_name = ""
    if is_left_table:
        table_key="lf"
        table_name =left_table_db_name
        opposite_table_name = right_table_db_name
    else:
        table_key="rg"
        table_name =right_table_db_name
        opposite_table_name = left_table_db_name
    full_select_list=[]
    for i in reference_column_list:
        full_select_list.append("\""+columnMap.get_mapped_column_for(i,table_key)+"\"")
    select_section = ','.join(full_select_list)
    return "select {0} from {1} where primaryHash IN (SELECT primaryHash FROM {1} GROUP BY primaryHash EXCEPT SELECT primaryHash FROM {2} GROUP BY primaryHash)".format(select_section,table_name,opposite_table_name)

def generate__conact_in_hash_query(hash_list):
    case_stmt = "(CASE WHEN TRIM(\"{0}\") ~ '^-?[0-9]+$' THEN CAST(CAST(TRIM(\"{0}\") AS BIGINT) AS CHAR(100)) ELSE TRIM(\"{0}\") END)"
    all_case = []
    for i in hash_list:
        all_case.append(case_stmt.format(i))

    return "CONCAT (" + ",".join(all_case)+")"

def generate_hash_cal_query(table_name,primary_hash_list):
    update_primary = "update {0} SET primaryHash = {1}".format(table_name,generate__conact_in_hash_query(primary_hash_list))
    return update_primary

def exec_query(query,db_creds):
    with psycopg2.connect(database=db_creds["database"],
                                        user=db_creds["user"],
                                        password=db_creds["password"],
                                        port=db_creds["port"],
                                        host=db_creds["host"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
        connection.commit()

def read_and_write_to_excel(query,writer,column_list,legend_recorder,db_creds):
    with psycopg2.connect(database=db_creds["database"],
                                        user=db_creds["user"],
                                        password=db_creds["password"],
                                        port=db_creds["port"],
                                        host=db_creds["host"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            equals = 0
            column_count = len(column_list)
            while 1:
                print "Equals found ",equals
                equals=equals+1
                sys.stdout.write("\033[F")
                result = cursor.fetchone()
                if result is None:
                    break
                for c in range(0,3*column_count,3):
                    ltval=result[c]
                    compval = str(result[c+1])
                    rgval=result[c+2]
                    if ltval is None:
                        ltval=""
                    else:
                        ltval=str(ltval)
                    if rgval is None:
                        rgval=""
                    else:
                        rgval=str(rgval)
                    
                    write_val=""
                    if compval=="MATCH":
                        write_val = ltval
                    elif compval=="SMATCH":
                        write_val = ltval + " ~! "+ rgval
                    elif compval=="DMATCH":
                        write_val = ltval + " =! "+ rgval
                    else:
                        compval = "ERROR"
                        write_val = ltval + "<ERROR COMPARISON>"+ rgval
                    writer.printIt(write_val,writer.colourCode[compval])
                    legend_recorder[column_list[c/3]][compval]=legend_recorder[column_list[c/3]][compval]+1
                writer.printItLine()
    return legend_recorder

def read_and_write_hashcollides_to_excel(query,writer,column_list,is_left_table,collide_type,legend_recorder,db_creds):
    with psycopg2.connect(database=db_creds["database"],
                                        user=db_creds["user"],
                                        password=db_creds["password"],
                                        port=db_creds["port"],
                                        host=db_creds["host"]) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            colour_name=""
            if collide_type=="multi" and is_left_table:
                colour_name="HcollidedOneFile"
                print "Hcollide in Left Table"
            elif collide_type=="multi" and not is_left_table:
                colour_name="HcollidedTwoFile"
                print "Hcollide in Right Table"
            elif collide_type=="single" and is_left_table:
                colour_name="FoundInOneFile"
                print "Diff in Left Table"
            elif collide_type=="single" and not is_left_table:
                colour_name="FoundInTwoFile"
                print "Diff in Right Table"
            column_count =len(column_list)
            diff = 0
            while 1:
                print "Diffs found ",diff
                diff=diff+1
                sys.stdout.write("\033[F")
                result = cursor.fetchone()
                if result is None:
                    break
                for c in range(0,column_count):
                    write_val =""
                    if result[c] is None:
                        write_val = ""
                    else:
                        write_val = result[c]
                    writer.printIt(write_val,writer.colourCode[colour_name])
                    legend_recorder[column_list[c]][colour_name]=legend_recorder[column_list[c]][colour_name]+1
                writer.printItLine()
    return legend_recorder

def identify_file_table_mapping(file_1,file_2,columnMap):
    file_1_columns = columnMap.get_column_names_from_csv(file_1)
    file_2_columns = columnMap.get_column_names_from_csv(file_2)
    file_1_mapping = columnMap.identify_table_from_column_list(file_1_columns,left_table_db_name,right_table_db_name)
    file_2_mapping = columnMap.identify_table_from_column_list(file_2_columns,left_table_db_name,right_table_db_name)
    left_tables_file = ""
    right_tables_file = ""
    if file_1_mapping == "both" and file_2_mapping == "both":
        left_tables_file = file_1
        right_tables_file = file_2
    elif file_1_mapping == "left" and file_2_mapping == "right":
        left_tables_file = file_1
        right_tables_file = file_2
    elif file_1_mapping == "right" and file_2_mapping == "left":
        right_tables_file = file_1
        left_tables_file = file_2
    elif file_1_mapping == "left" and file_2_mapping == "both":
        left_tables_file = file_1
        right_tables_file = file_2
    elif file_1_mapping == "right" and file_2_mapping == "both":
        right_tables_file = file_1
        left_tables_file = file_2
    elif file_1_mapping == "both" and file_2_mapping == "right":
        left_tables_file = file_1
        right_tables_file = file_2
    elif file_1_mapping == "both" and file_2_mapping == "left":
        right_tables_file = file_1
        left_tables_file = file_2
    else:
        right_tables_file = '{0} OR {1}'.format(file_1,file_2)
        left_tables_file = '{0} OR {1}'.format(file_1,file_2)
    return left_tables_file,right_tables_file

try:
    exec_query(open(config['QUERY']['query_comparison_funtion_path']).read(),db_creds)
    exec_query(open(config['QUERY']['query_convert_type_funtion_path']).read(),db_creds)
    exec_query(open(config['QUERY']['query_type_detect_funtion_path']).read(),db_creds)


    p_left = mp.Process(target=read_and_store_db, args=(left_table_db_name,file_1_path,"postgresql://{1}:{2}@{3}:{4}/{0}".format(db_creds["database"],db_creds["user"],db_creds["password"],db_creds["host"],db_creds["port"])))
    p_right = mp.Process(target=read_and_store_db, args=(right_table_db_name,file_2_path,"postgresql://{1}:{2}@{3}:{4}/{0}".format(db_creds["database"],db_creds["user"],db_creds["password"],db_creds["host"],db_creds["port"])))
    p_left.start()
    p_right.start()
    p_left.join()
    p_right.join()


    columnMap = ColumnMap(file_1_path,file_2_path,pks,map_file_path,left_table_db_name,right_table_db_name)
    left_file,right_file = identify_file_table_mapping(file_1_path,file_2_path,columnMap)
    left_fname = left_file.split("/")[-1]
    right_fname = right_file.split("/")[-1]
    colourCodeDesc["FoundInOneFile"] ="Cells (rows) which are only found in {0}".format(left_fname)
    colourCodeDesc["FoundInTwoFile"] ="Cells (rows) which are only found in {0}".format(right_fname)
    colourCodeDesc["HcollidedOneFile"] ="Cells (rows) which cannot process due to hash collision {0}".format(left_fname)
    colourCodeDesc["HcollidedTwoFile"] ="Cells (rows) which cannot process due to hash collision {0}".format(right_fname)
    if mode=="m":
        columnMap.generate_mapping_file(map_file_path,db_creds_mysql)
    else:
        columnMap.read_map_file()
        columnMap.backup_map_file(db_creds_mysql["host"],db_creds_mysql["port"],db_creds_mysql["user"],db_creds_mysql["password"],db_creds_mysql["database"])
        pk_col_map={"left":[],"right":[]}
        for i in pks:
            pk_col_map["left"].append(columnMap.get_mapped_column_for(i,"lf"))
            pk_col_map["right"].append(columnMap.get_mapped_column_for(i,"rg"))
        left_hash_q = generate_hash_cal_query(left_table_db_name,pk_col_map["left"])
        right_hash_q = generate_hash_cal_query(right_table_db_name,pk_col_map["right"])

        start_time = time.time()
        exec_query("ALTER TABLE "+left_table_db_name+" ADD primaryHash varchar("+str(100*len(pks))+");",db_creds)
        exec_query("ALTER TABLE "+right_table_db_name+" ADD primaryHash varchar("+str(100*len(pks))+");",db_creds)
        p_left = mp.Process(target=exec_query, args=(left_hash_q,db_creds,))
        p_right = mp.Process(target=exec_query, args=(right_hash_q,db_creds,))

        p_left.start()
        p_right.start()
        p_left.join()
        p_right.join()
        print "Hash Calculation completed within {0} seconds".format(time.time()-start_time)


        print "Generating queries"
        out_put_column_list = columnMap.get_refrence_columns_for_output()
        legend_recorder = init_legend_reord(out_put_column_list)
        match_find_query= generate_select_query_for_fetch_data(out_put_column_list,columnMap,left_table_db_name,right_table_db_name)
        hash_collide_query_left = generate_hash_collide_detection_query(out_put_column_list,columnMap,True,left_table_db_name,right_table_db_name)
        hash_collide_query_right = generate_hash_collide_detection_query(out_put_column_list,columnMap,False,left_table_db_name,right_table_db_name)
        hash_mis_quert_left =generate_hash_mis_detection_query(out_put_column_list,columnMap,True,left_table_db_name,right_table_db_name)
        hash_mis_quert_right =generate_hash_mis_detection_query(out_put_column_list,columnMap,False,left_table_db_name,right_table_db_name)
        print match_find_query
        excellWriter = WriteToExcel(colourCode,colourCodeDesc)
        excellWriter.openFile("Data")
        excellWriter.createTableHeader(out_put_column_list)
        print "Comparing started"
        legend_recorder = read_and_write_to_excel(match_find_query,excellWriter,out_put_column_list,legend_recorder,db_creds)
        print "Equals calculation finished"
        legend_recorder = read_and_write_hashcollides_to_excel(hash_collide_query_left,excellWriter,out_put_column_list,True,"multi",legend_recorder,db_creds)
        print "Hash Collision calculation completed for lefttable"
        legend_recorder = read_and_write_hashcollides_to_excel(hash_collide_query_right,excellWriter,out_put_column_list,False,"multi",legend_recorder,db_creds)
        print "Hash Collision calculation completed for righttable"
        legend_recorder = read_and_write_hashcollides_to_excel(hash_mis_quert_left,excellWriter,out_put_column_list,True,"single",legend_recorder,db_creds)
        print "Records only in lefttable calculation completed"
        legend_recorder = read_and_write_hashcollides_to_excel(hash_mis_quert_right,excellWriter,out_put_column_list,False,"single",legend_recorder,db_creds)
        print "Records only in righttable calculation completed"
        excellWriter.printLegendery(legend_recorder,out_put_column_list)
        excellWriter.printItLine()

        excellWriter.printItLine("Cell data Format")
        excellWriter.printItLine("{0} VS {1}".format(left_fname,right_fname))
        excellWriter.printItLine()
        excellWriter.printIt("KEYS:- ","99656f")
        for pk in out_put_column_list[:len(pks)]:
            excellWriter.printIt(pk,"99656f")
        excellWriter.printItLine()
        start_time = time.time()
        excellWriter.saveIt(out_put_file_name)
        print "Writing to file completed within {0} seconds".format(time.time()-start_time)
except Exception as e:
    sys.stderr.write("ERROR OCCURED WHILE PROCESSING YOUR REQUEST")
    sys.stderr.write(str(e))
    exec_query("DROP TABLE IF EXISTS {0}".format(left_table_db_name),db_creds)
    exec_query("DROP TABLE IF EXISTS {0}".format(right_table_db_name),db_creds)
    raise e

exec_query("DROP TABLE IF EXISTS {0}".format(left_table_db_name),db_creds)
exec_query("DROP TABLE IF EXISTS {0}".format(right_table_db_name),db_creds)