package com.brm.GoatEngine.FSM;


import com.badlogic.gdx.utils.XmlWriter;

import java.io.IOException;
import java.io.StringWriter;
import java.util.ArrayList;

/**
 * A Data Driven State Machine
 */
public class FiniteStateMachine {

    private ArrayList<MachineState> states = new ArrayList<MachineState>();
    private MachineState currentState;

    public FiniteStateMachine(){

    }


    /**
     * Saves the machine to XML
     * @param filePath
     */
    public void saveToXML(String filePath) throws IOException {
        StringWriter writer = new StringWriter();
        XmlWriter xml = new XmlWriter(writer);
        xml.element("TestMachine");
        for(MachineState state: this.states){
            state.writeXml(xml);
        }
        xml.pop();
        System.out.println(writer);

    }


    public void addState(MachineState s) {
        this.states.add(s);
    }
}
