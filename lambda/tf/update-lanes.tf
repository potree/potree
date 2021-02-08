//TODO there a lot of TODOs listed below since this config represents the imported lambda config and so things like filenames don't apply since filenames weren't used to build the layers or the function. When the need arises to change the function we can add the filenames back in.

resource "aws_iam_role" "update-lanes-role" {
  name = "UpdateLanes-role-6cczotiu"  // TODO: name given by AWS prior to TF import - can change it here if we like but doing so will recreate the role
  path = "/service-role/"  //TODO: also created by AWS console ... can probably just remove but doing so will recreate the role
  assume_role_policy = <<EOF
{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "Service": "lambda.amazonaws.com"
          },
          "Action": "sts:AssumeRole"
        }
      ]
    }
    EOF
}

resource "aws_iam_policy" "update-lanes-role-policy" {
  name = "AWSLambdaBasicExecutionRole-849fe334-ef5c-415f-b3d0-1ca0c08ddf34"  //TODO rename
  path = "/service-role/"
  policy = <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "logs:CreateLogGroup",
            "Resource": "arn:aws:logs:us-east-1:757877321035:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:us-east-1:757877321035:log-group:/aws/lambda/UpdateLanes:*"
            ]
        }
    ]
}
    EOF
}

// TODO: move layer zip files in to s3 (TF supports loading from there)
// TODO: add the filename back in (just uncomment) ... TF import didn't create a filename in the state for some reason
resource "aws_lambda_layer_version" "update-lanes-numpy-layer" {
  source_code_hash = filebase64sha256("../layer/numpy-1.18.5.zip")
  layer_name = "NumPyLayer"
  compatible_runtimes = []
}

// The flatbuffer GroundTruth PY compiled code is in here
resource "aws_lambda_layer_version" "update-lanes-flatbuffers-layer" {
  source_code_hash = filebase64sha256("../layer/python-flatbuffers.zip")
  layer_name = "PythonFlatBuffersLayer"
  compatible_runtimes = []
}

// TODO: Shapely and Google flatbuffers are both in here - should probably split out
resource "aws_lambda_layer_version" "update-lanes-updatelanes-layer" {
  source_code_hash = filebase64sha256("../layer/updatelanes.zip")
  layer_name = "UpdateLanesLayer"

  compatible_runtimes = []
}

resource aws_lambda_function "update-lanes-lambda" {
  function_name = "UpdateLanes"
  handler = "lambda_function.lambda_handler"
  source_code_hash = filebase64sha256("../py/update-lanes.zip")
  runtime = "python3.7"
  layers = ["arn:aws:lambda:us-east-2:259788987135:layer:AWSLambda-Python37-SciPy1x:35", aws_lambda_layer_version.update-lanes-flatbuffers-layer.arn, aws_lambda_layer_version.update-lanes-updatelanes-layer.arn]
  role = aws_iam_role.update-lanes-role.arn
  timeout = 900
  memory_size = 2048
  publish = false
}
