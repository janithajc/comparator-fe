CREATE TABLE `comparedb`.`maprepo` (
  `file1_name` VARCHAR(200) NOT NULL,
  `file2_name` VARCHAR(200) NOT NULL,
  `task_id` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`file1_name`, `file2_name`));