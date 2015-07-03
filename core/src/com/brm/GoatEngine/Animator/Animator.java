package com.brm.GoatEngine.Animator;

import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.XmlReader;
import com.badlogic.gdx.utils.XmlWriter;
import com.brm.GoatEngine.Utils.Logger;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.HashMap;

/**
 * A state machine changing animations for entities
 */
public class Animator{

    private AnimState enterState;        //The enter state
    private AnimState exitState;         // The exit state
    private AnimState currentState;
    ArrayList<AnimState> states = new ArrayList<AnimState>();
    HashMap<String, Parameter> parameters = new HashMap<String, Parameter>();





    /**
     * Adds a new State
     * @param state
     * @return this for chaining
     */
    public Animator addState(AnimState state){
        this.states.add(state);
        return this;
    }

    /**
     * Adds a new Parameter
     * @param name
     * @return this for chaining
     */
    public Animator addParameter(String name){
        parameters.put(name, new Parameter());
        return this;
    }



    public void update(){
        if(this.enterState == null){
            this.enterState = this.states.get(0);
        }
        if(this.currentState == null){
            this.currentState = enterState;
        }


        for(Transition transition : currentState.getTransitions()){
            if(transition.canChange()){
                this.currentState = transition.getNextState();
            }
        }


        Logger.debug(this.currentState.getAnimation());
    }



    public AnimState getState(String animName){
        for(AnimState state: this.states){

            if(state.getAnimation().equals(animName)){
                return state;
            }
        }
        return null;
    }




    /**
     * Sets a float parameter value identified by name
     * @param name
     * @param value
     */
    public void setFloat(String name, Float value){
        parameters.get(name).setValue(value);
    }

    /**
     * Sets a boolean parameter value identified by name
     * @param name
     * @param value
     */
    public void setBool(String name, Boolean value){
        parameters.get(name).setValue(value);
    }

    /**
     * Sets a String parameter value identified by name
     * @param name
     * @param value
     */
    public void setString(String name, String value){
        parameters.get(name).setValue(value);
    }

    /**
     * Sets a integer parameter value identified by name
     * @param name
     * @param value
     */
    public void setInt(String name, Integer value){
        parameters.get(name).setValue(value);
    }


    public AnimState getEnterState() {
        return enterState;
    }

    public void setEnterState(AnimState enterState) {
        this.enterState = enterState;
    }

    public AnimState getExitState() {
        return exitState;
    }

    public void setExitState(AnimState exitState) {
        this.exitState = exitState;
    }

    public AnimState getCurrentState() {
        return currentState;
    }

    public void setCurrentState(AnimState currentState) {
        this.currentState = currentState;
    }

    public Parameter getParameter(String name) {
        return this.parameters.get(name);
    }



    /**
     * Saves the machine to XML
     * @param filePath
     */
    /*public void saveToXML(String filePath) throws IOException {
        StringWriter writer = new StringWriter();
        XmlWriter xml = new XmlWriter(writer);
        xml.element("TestMachine");
        for(MachineState state: this.states){
            state.writeXml(xml);
        }
        xml.pop();
        //Write Xml
        FileOutputStream out = new FileOutputStream(filePath);
        out.write(writer.toString().getBytes());

    }*/


    /*public void loadFromXml(String filePath) throws IOException {
        XmlReader reader = new XmlReader();
        XmlReader.Element root = reader.parse(Gdx.files.internal(filePath));
        Array<XmlReader.Element> states = root.getChildrenByName("State");

        for(XmlReader.Element state : states){
            this.addState(new MachineState(state));
        }
    }*/









}
