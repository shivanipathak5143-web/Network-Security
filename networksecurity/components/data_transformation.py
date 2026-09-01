import sys
import os
import numpy as np
import pandas as pd
from sklearn.impute import KNNImputer
from sklearn.pipeline import Pipeline
from networksecurity.constant.training_pipeline import TARGET_COLUMN
from networksecurity.constant.training_pipeline import DATA_TRANSFORMATION_IMPUTER_PARAMS
from networksecurity.entity.artifact_entity import (
    DataTransformationArtifact, DataValidationArtifact
)
from networksecurity.entity.config_entity import DataTransformationConfig
from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging
from networksecurity.utils.main_utils.utils import save_numpy_array_data, save_object

class DataTransformation:
    def __init__(self,data_validation_artifact:DataValidationArtifact,
                 data_transformation_config:DataTransformationConfig):
            try:
                  self.data_validation_artifact:DataValidationArtifact=data_validation_artifact
                  self.data_transformation_config:DataTransformationConfig=data_transformation_config
            except Exception as e:
                  raise NetworkSecurityException(e,sys)
    @staticmethod
    def read_data(file_path)->pd.DataFrame:
          try:
                return pd.read_csv(file_path)
          except Exception as e:
                raise NetworkSecurityException(e,sys)

    def initiate_data_transformation(self)->DataValidationArtifact:
          logging.info('Entered initiate data_transformation method od DataTransformation class')
          try:
                logging.info('Starting data transformation')
          except Exception as e:
                raise NetworkSecurityException(e,sys)

