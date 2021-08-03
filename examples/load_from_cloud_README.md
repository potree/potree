# Potree Cloud Loader Functionality and Configuration: #

The code contained in 'load_from_cloud.html' enables reading point clouds from private cloud buckets and containers. 'load_from_cloud.html' shows how to sign URLs for Amazon Web Services, Microsoft Azure, and Google Cloud Platform, thus allowing the loading of point clouds from any of those cloud service providers. The provided functionality is compatible with both Potree Converter 1.0 and 2.0.

Note that tests for this code are not provided, since they would require credentials to access private cloud buckets/containers. If individuals want to test using the private cloud examples we used, arrangements can be made to provide read-only credentials valid for a short time.

Note: The signing processes for AWS, Azure, and GCP vary significantly. Notably, the cloud storage providers handle the 'range' header in different ways, which must be taken into account when working with this code. Desired code changes should be tested with all cloud service providers before they are committed. Dealing with the 'range' header is described below (when necessary). Furthermore, note that in the future when additional headers or query parameters are added, the signed URL will most likely change, which will have to be dealt with accordingly. The current generated signed URLs may not support all future desired headers and query parameters.


## AWS, Azure, and GCP Configuration: ##

### AWS: ###
Go to the Amazon S3 console.

#### Region/Bucket: #### 
- Find the desired bucket under "Buckets", and fill in on the form.
- Next to the name of the bucket is the "AWS Region". Fill in the region name on the form (lowercase and hyphenated).
- Ensure that the bucket has the correct permissions associated with it.

#### Folder Name: #### 
- Click on the bucket.
- Under "Objects", folders can be seen.
- Fill in the name of the folder on the form.

#### AWS Access Key ID and Secret: #### 
- Click on the "Services" drop down menu
- Under "Security, Identity, & Compliance", click on "IAM".
- On the right hand side of the page, under "Quick links", click on "My access key".
- Click "Create access key".
- Fill in the Access key ID and secret access key on the form. After this window is closed, the secret access key will no longer be available.


#### CORS Configuration: ####
- A CORS configuration must be set up for the S3 bucket. 
- Follow the information in the "Configuring CORS for an Amazon S3 Bucket" section, found [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/cors.html).

Below is an example CORS policy:\
    [\
        &nbsp;&nbsp;{\
            &nbsp;&nbsp;&nbsp;&nbsp;"AllowedHeaders": [\
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"*"\
            &nbsp;&nbsp;&nbsp;&nbsp;],\
            &nbsp;&nbsp;&nbsp;&nbsp;"AllowedMethods": [\
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"HEAD",\
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"GET",\
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"POST"\
            &nbsp;&nbsp;&nbsp;&nbsp;],\
            &nbsp;&nbsp;&nbsp;&nbsp;"AllowedOrigins": [\
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"*"\
            &nbsp;&nbsp;&nbsp;&nbsp;],\
            &nbsp;&nbsp;&nbsp;&nbsp;"ExposeHeaders": [\
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"Content-Length",\
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"ETag",\
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"x-amz-meta-first-image-name",\
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"x-amz-meta-last-image-name"\
            &nbsp;&nbsp;&nbsp;&nbsp;],\
            &nbsp;&nbsp;&nbsp;&nbsp;"MaxAgeSeconds": 0\
        &nbsp;&nbsp;}\
    ]



### Azure: ### 
Go to the [Portal home page](https://portal.azure.com/#home).

#### Storage Account Name: #### 
- Under 'Azure services", click "Storage accounts".
- Fill in the account name on the form.
- Click on the account (to find container name and key).

#### Container Name: #### 
- On the left panel, under "Blob service", click on "Containers".
- Fill in the container name on the form.
- Ensure that the container has the correct permissions associated with it.

#### Secret Key: #### 
- On the left panel, under "Settings", click on "Access keys".
- Click "Show keys".
- Fill in the azure key on the form.

#### CORS Policy: ####
- A CORS policy must be created to access Azure using a browser.
- On the left panel, under "Settings", click on "CORS".
- Click on "Blob Service" and create a new CORS policy. Fill in the fields to dictate the desired permissions. Use a "*" to indicate "all", which is an appropriate value for "Allowed origins", "Allowed headers", and "Exposed headers".



### GCP: ### 
#### Bucket Name: #### 
- Go to Google Cloud Platform home page.
- Under the "Resources" section, click on "Storage", to show the buckets.
- Fill in the name of the bucket on the form.
- Ensure that the bucket has the correct permissions associated with it.

#### Create Key: #### 
- Click [here](https://cloud.google.com/iam/docs/creating-managing-service-account-keys#iam-service-account-keys-create-console).
- Scroll down to the "Creating service account keys" section.
- Follow the instructions to create a JSON key.
- Save the JSON key file locally.
- Click "choose file" on the html page and select the saved key file.

#### CORS Policy File: #### 
- A CORS policy is needed to access GCP from the browser.
- For point clouds generated by PotreeConverter 2.0, the 'Range' header must be included in the CORS policy.
- Follow the information on "Configuring CORS on a bucket" found [here](https://cloud.google.com/storage/docs/configuring-cors).
- Add "Range" as a "responseHeader".
- An example CORS configuration is shown below:\
[\
    &nbsp;&nbsp;{\
     &nbsp;&nbsp;&nbsp;&nbsp;"origin": ["http://localhost:1234"],\
      &nbsp;&nbsp;&nbsp;&nbsp;"responseHeader": ["Range"],\
      &nbsp;&nbsp;&nbsp;&nbsp;"method": ["PUT", "POST", "GET"],\
      &nbsp;&nbsp;&nbsp;&nbsp;"maxAgeSeconds": 43200\
    &nbsp;&nbsp;}\
]
- Set up the configuration for the bucket as descrbed at the given link, using the gsutil cors command.
