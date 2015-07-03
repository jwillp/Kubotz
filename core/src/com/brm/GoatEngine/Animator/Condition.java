package com.brm.GoatEngine.Animator;

import java.util.IllegalFormatException;

/**
 * A condition to change from one state
 * to another
 */
public class Condition{


    public enum ConditionOperation{
        GREATER_THAN,
        LESS_THAN,
        EQUALS,
    }


    private Parameter parameter;  //left
    private ConditionOperation operation;  //the operation to do
    private Comparable comparatorValue;

    public Condition(Parameter parameter, ConditionOperation operation, Comparable comparatorValue) {
        this.parameter = parameter;
        this.operation = operation;
        this.comparatorValue = comparatorValue;
    }


    /**
     * Evaluates the current condition
     * @return
     */
    public boolean evaluate(){

        if(parameter.getValue() == null){
            return false;
        }

        if(parameter.getValue() instanceof Integer)
            return evaluateInteger();

        if(parameter.getValue() instanceof Float)
            return evaluateFloat();

        if(parameter.getValue() instanceof Boolean)
            return evaluateBoolean();

        if(parameter.getValue() instanceof String)
            return evaluateString();

        if(parameter.getValue() instanceof Trigger)
            return evaluateTrigger();

        throw new UnsupportedOperationException(operation.toString() + " cannot be processed to ");
    }


    /**
     * Evaluates Integers
     * @return
     */
    private boolean evaluateInteger(){
        Integer value = (Integer) parameter.getValue();
        Integer rightTerm = (Integer) comparatorValue;
        if(operation == ConditionOperation.GREATER_THAN){
                return value > rightTerm;
        }



        if(operation == ConditionOperation.LESS_THAN){
            return value < rightTerm;
        }

        if(operation == ConditionOperation.EQUALS){
            return value.equals(rightTerm);
        }

       throw new UnsupportedOperationException(operation.toString() + " cannot be applied to " + value.getClass().toString());
    }

    /**
     * Evaluates Strings
     * @return
     */
    private boolean evaluateString(){
        String value = (String) parameter.getValue();
        String rightTerm = (String) comparatorValue;

        if(operation == ConditionOperation.EQUALS){
            return value.equals(rightTerm);
        }

        throw new UnsupportedOperationException(operation.toString() + " cannot be applied to " + value.getClass().toString());
    }

    /**
     * Evaluates Floats
     * @return
     */
    private boolean evaluateFloat(){
        Float value = (Float) parameter.getValue();
        Float rightTerm = (Float) comparatorValue;
        if(operation == ConditionOperation.GREATER_THAN){
            return value > rightTerm;
        }

        if(operation == ConditionOperation.LESS_THAN){
            return value < rightTerm;
        }

        if(operation == ConditionOperation.EQUALS){
            return value.equals(rightTerm);
        }

        throw new UnsupportedOperationException(operation.toString() + " cannot be applied to " + value.getClass().toString());
    }

    /**
     * Evaluates Booleans
     * @return
     */
    private boolean evaluateBoolean(){
        Boolean value = (Boolean) parameter.getValue();
        Boolean rightTerm = (Boolean) comparatorValue;

        if(operation == ConditionOperation.EQUALS){
            return value.equals(rightTerm);
        }

        throw new UnsupportedOperationException(operation.toString() + " cannot be applied to " + value.getClass().toString());
    }


    /**
     * Evaluates a trigger
      * @return
     */
    private boolean evaluateTrigger(){
        Trigger trigger = (Trigger) parameter.getValue();
        Boolean value = trigger.getValue();
        Boolean rightTerm = (Boolean) comparatorValue;

        if(operation == ConditionOperation.EQUALS){
            return value.equals(rightTerm);
        }

        throw new UnsupportedOperationException(operation.toString() + " cannot be applied to " + value.getClass().toString());
    }

}
