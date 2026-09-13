import os
import sys
import certifi
ca = certifi.where()

from dotenv import load_dotenv
load_dotenv()
mongo_db_url = os.getenv('MONGODB_URL_KEY')
print(mongo_db_url)
import pymongo
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging
from networksecurity.pipeline.training_pipeline import TrainigPipeline
from networksecurity.utils.ml_utils.model.estimator import NetworkModel

from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, File, UploadFile, Request
from uvicorn import run as app_run
from fastapi.responses import Response, JSONResponse
from starlette.responses import RedirectResponse
import pandas as pd

from networksecurity.utils.main_utils.utils import load_object

client = pymongo.MongoClient(mongo_db_url, tlsCAFile=ca)

from networksecurity.constant.training_pipeline import (
    DATA_INGESTION_COLLECTION_NAME,
    DATA_INGESTION_DATABASE_NAME
)

database = client[DATA_INGESTION_DATABASE_NAME]
collection = database[DATA_INGESTION_COLLECTION_NAME]

app = FastAPI()
origins = ['*']

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

EXPECTED_COLUMNS = [
    'having_IP_Address', 'URL_Length', 'Shortining_Service', 'having_At_Symbol',
    'double_slash_redirecting', 'Prefix_Suffix', 'having_Sub_Domain', 'SSLfinal_State',
    'Domain_registeration_length', 'Favicon', 'port', 'HTTPS_token', 'Request_URL',
    'URL_of_Anchor', 'Links_in_tags', 'SFH', 'Submitting_to_email', 'Abnormal_URL',
    'Redirect', 'on_mouseover', 'RightClick', 'popUpWidnow', 'Iframe', 'age_of_domain',
    'DNSRecord', 'web_traffic', 'Page_Rank', 'Google_Index', 'Links_pointing_to_page',
    'Statistical_report'
]


@app.get('/', tags=['authentication'])
async def index():
    return RedirectResponse(url='/docs')


@app.get('/train')
async def train_route():
    try:
        train_pipeline = TrainigPipeline()
        train_pipeline.run_pipeline()
        return Response('Training is successful')
    except Exception as e:
        raise NetworkSecurityException(e, sys)


@app.post('/predict')
async def predict_route(file: UploadFile = File(...)):
    """
    Accepts a CSV of the 30 phishing-detection feature columns and returns
    JSON predictions instead of an HTML table, so the React frontend can
    render them directly.
    """
    try:
        df = pd.read_csv(file.file)

        missing = set(EXPECTED_COLUMNS) - set(df.columns)
        if missing:
            raise NetworkSecurityException(
                f"Missing required columns: {missing}", sys
            )

        preprocessor = load_object('final_model/preprocessor.pkl')
        final_model = load_object('final_model/model.pkl')
        network_model = NetworkModel(preprocessor=preprocessor, model=final_model)

        y_pred = network_model.predict(df)
        df['predicted_column'] = y_pred

        os.makedirs('prediction_output', exist_ok=True)
        df.to_csv('prediction_output/output.csv', index=False)

        records = df.to_dict(orient='records')

        return JSONResponse(
            content={
                'row_count': len(records),
                'phishing_count': int((df['predicted_column'] == 1).sum()),
                'legitimate_count': int((df['predicted_column'] == 0).sum()),
                'rows': records,
            }
        )
    except Exception as e:
        raise NetworkSecurityException(e, sys)


if __name__ == '__main__':
    app_run(app, host='0.0.0.0', port=8080)