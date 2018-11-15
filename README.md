# comparator-fe

# How to start

## Basic configurations
In the `/config/default.json`, add the base path where the generated files should be stored on the server and most importantly
set the absolute path of the comparison tool.
The modified version of the comparison tool is included in `/public/tools/compare.py`

## Starting the server
```bash
npm install
npm start
```

## Doing the comparison
> *Note:* This is still in a very primitive state. The code is bad and the functionality is worse.

### Step 1: Setting up the scenario
#### 1.1 Name a scenario that you are testing
> *Note:* 
>* Please do not use special characters including spaces when naming your scenarios, just stick to letters and numbers
>* A scenario is how the server identifies a specific comparison, therefore if you use the same scenario name, the files in the
> server for that scenario will get overwritten

#### 1.2 Select the files to compare
The file names of these will be shown on the resulting excel file
> *Note:*
>* Named left and right on the placeholders as those are the positions that they will show up on the resulting excel
>* Both files *need to be* of .csv format and *need to contain* headers
>* The names for both files need to be only letters and numbers (Except for the .csv part of-course)
>* You *cannot* proceed without selecting both files (Why would you?)

#### 1.3 Click next to upload the files and proceed

### Step 2: Mapping the Columns
#### 2.1 Upload or Auto-Generate column mapping
* If you already have a map.csv that works for the files that you are trying to compare, simply upload it by clicking `Load`.
* If you need to perform the mapping, click `Auto-Generate`, once the generation is complete, the download button will flash.
This is your cue to download the map.csv file, modify it so that all the columns match up in both files, then re-upload it
by clicking `Load`

#### 2.2 Select the Primary Keys(Composite Key) that will be used to compare these files.
* The column names from both files will appear (the left file the left and the right file on the right)
* Tick the columns that should be the Primary Keys 
** Tick only the relevant column from one side (left or right)
** If the column names are the same, only 1 of them can be ticked from either side

#### 2.3 Click Next to finalize the column mappings and primary keys

### Step 3: Compare and Download
#### 3.1 Click `Compare` to start the comparison
* This will take a while to complete, depending on the size of the file.
* Pay attention to the console to see what's hapenning, if you see red text, something has gone wrong :(

#### 3.1.1 Click `Back` to go back and fix something
* If something went wrong and it seems that can be fixed by going to the previous screens, this is the way to do it

#### 3.2 Download the compared file
* Once the comparison is complete, the download will start automatically if you're on the same screen
* If you return to the screen after the comparison has completed, the download button will be flashing and a weird
log with diffs and row counts will be visible on the console.

#### 3.3 Click `Compare Another` to start over with new files!
