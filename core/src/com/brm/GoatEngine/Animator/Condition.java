package com.brm.GoatEngine.Animator;

/**
 * A condition to change from one state
 * to another
 */
public class Condition{


    public enum ConditionOperation{
        GREATER_THAN,
        LESS_THAN
    }


    private Parameter parameter;  //left
    private ConditionOperation operation;  //the operation to do
    private Object comparatorValue;

    public Condition(Parameter parameter, ConditionOperation operation, Object comparatorValue) {
        this.parameter = parameter;
        this.operation = operation;
        this.comparatorValue = comparatorValue;
    }


    /**
     * Evaluates the current condition
     * @return
     */
    public boolean evaluate(){

        if(operation == ConditionOperation.GREATER_THAN){
            return true;
        }



        if(operation == ConditionOperation.LESS_THAN){
            return true;
        }

        return true;

    }


}
