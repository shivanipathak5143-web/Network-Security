import os
import sys

from networksecurity.exception.exception import NetworkSecurityException
from networksecurity.logging.logger import logging

from networksecurity.entity.artifact_entity import (
    DataTransformationArtifact,
    ModelTrainerArtifact
)

from networksecurity.entity.config_entity import ModelTrainerConfig

from networksecurity.utils.main_utils.utils import (
    save_object,
    load_object,
    load_numpy_array_data,
    evaluate_models
)
import mlflow

from networksecurity.utils.ml_utils.metric.classification_metric import (
    get_classification_score
)

from networksecurity.utils.ml_utils.model.estimator import NetworkModel

from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import (
    AdaBoostClassifier,
    GradientBoostingClassifier,
    RandomForestClassifier,
)


class ModelTrainer:

    def __init__(
        self,
        model_trainer_config: ModelTrainerConfig,
        data_transformation_artifact: DataTransformationArtifact
    ):
        try:
            # Store the actual config object passed to the constructor
            self.model_trainer_config = model_trainer_config

            self.data_transformation_artifact = data_transformation_artifact

        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def track_mlflow(self,best_model,classificationmetric):
        with mlflow.start_run():
            f1_score=classificationmetric.f1_score
            precision_score=classificationmetric.precision_score
            recall_score=classificationmetric.recall_score

            mlflow.log_metric('f1_score',f1_score)
            mlflow.log_metric('precision',precision_score)
            mlflow.log_metric('recall_score',recall_score)
            mlflow.sklearn.log_model(best_model,'model')



    def train_model(self, x_train, y_train, x_test, y_test):

        try:

            models = {
                'Random Forest': RandomForestClassifier(verbose=1),
                'Decision Tree': DecisionTreeClassifier(),
                'Gradient Boosting': GradientBoostingClassifier(verbose=1),
                'Logistic Regression': LogisticRegression(verbose=1),
                'AdaBoost': AdaBoostClassifier(),
            }

            params = {

                'Decision Tree': {
                    'criterion': ['gini', 'entropy', 'log_loss'],
                },

                'Random Forest': {
                    'n_estimators': [8, 16, 32, 64, 128, 256]
                },

                'Gradient Boosting': {
                    'learning_rate': [.1, .01, .05, .001],
                    'subsample': [0.6, 0.7, 0.75, 0.8, 0.85, 0.9],
                    'n_estimators': [8, 16, 32, 64, 128, 256]
                },

                'Logistic Regression': {},

                'AdaBoost': {
                    'learning_rate': [.1, .01, 0.5, .001],
                    'n_estimators': [8, 16, 32, 64, 128, 256]
                }
            }

            # Evaluate all models
            model_report: dict = evaluate_models(
                x_train=x_train,
                y_train=y_train,
                x_test=x_test,
                y_test=y_test,
                models=models,
                param=params
            )

            # Get best model score
            best_model_score = max(sorted(model_report.values()))

            # Get best model name
            best_model_name = list(model_report.keys())[
                list(model_report.values()).index(best_model_score)
            ]

            # Get best model
            best_model = models[best_model_name]

            # Training predictions
            y_train_pred = best_model.predict(x_train)

            classification_train_metric = get_classification_score(
                y_true=y_train,
                y_pred=y_train_pred
            )
            self.track_mlflow(best_model, classification_train_metric)

            # Testing predictions
            y_test_pred = best_model.predict(x_test)

            classification_test_metric = get_classification_score(
                y_true=y_test,
                y_pred=y_test_pred
            )
            self.track_mlflow(best_model,classification_test_metric)

            # Load preprocessing object
            preprocessor = load_object(
                file_path=self.data_transformation_artifact.transformed_object_file_path
            )

            # Create model directory
            model_dir_path = os.path.dirname(
                self.model_trainer_config.trained_model_file_path
            )

            os.makedirs(
                model_dir_path,
                exist_ok=True
            )

            # Create final network model
            network_model = NetworkModel(
                preprocessor=preprocessor,
                model=best_model
            )

            # Save model
            save_object(
                self.model_trainer_config.trained_model_file_path,
                obj=network_model
            )

            # Create artifact
            model_trainer_artifact = ModelTrainerArtifact(
                trained_model_file_path=self.model_trainer_config.trained_model_file_path,
                train_metric_artifact=classification_train_metric,
                test_metric_artifact=classification_test_metric
            )

            logging.info(
                f"Model trainer artifact: {model_trainer_artifact}"
            )

            return model_trainer_artifact

        except Exception as e:
            raise NetworkSecurityException(e, sys)

    def initiate_model_trainer(self) -> ModelTrainerArtifact:

        try:

            train_file_path = (
                self.data_transformation_artifact.transformed_train_file_path
            )

            test_file_path = (
                self.data_transformation_artifact.transformed_test_file_path
            )

            # Load transformed numpy arrays
            train_arr = load_numpy_array_data(train_file_path)
            test_arr = load_numpy_array_data(test_file_path)

            # Separate X and Y
            x_train, y_train, x_test, y_test = (
                train_arr[:, :-1],
                train_arr[:, -1],
                test_arr[:, :-1],
                test_arr[:, -1],
            )

            # FIX 2:
            # Pass all four arguments
            return self.train_model(
                x_train,
                y_train,
                x_test,
                y_test
            )

        except Exception as e:
            raise NetworkSecurityException(e, sys)