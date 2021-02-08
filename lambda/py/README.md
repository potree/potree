The update lanes source code is currently zipped in file `update-lanes.zip`.  This file was directly downloaded from the Lambda serice in us-east-2.

For some unknown reason, unzipping the source and attempting to re-zip causes Terraform to want to update the function in Lammbda, even though the source isn't changed.

As a result, leave it as a zip file for now.  If and when changes are needed (hopefully never since we want to move the functionality into POTree) then we can unzip, and make the necessary changes to source and update the Lambda service. 


