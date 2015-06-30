package com.brm.GoatEngine.FSM;

import com.badlogic.gdx.utils.XmlReader;
import com.badlogic.gdx.utils.XmlWriter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;

/**
 * State of an FSM
 */
public class MachineState{


    /**
     * Special Flags for states
     */
    public enum StateFlag{
        None,
        Enter,  // Root Node (only one per machine)
        Exit    // The End of a path (normally we get back to an the Enter Node)
    }

    String id;                          // A Unique ID for that node
    String name;                        // The name of the state
    String description;                 // A Description for the state
    ArrayList<String> neighbours;       // The Direct Neighbours of the node
    StateFlag flag;                     // The flag of the node

    /**
     *
     * @param id
     * @param flag
     * @param name
     * @param description
     * @param neighbours the neighbours' unique Id as a CSV string
     */
    public MachineState(String id, StateFlag flag, String name, String description, String neighbours){
        this.id = id;
        this.flag = flag;
        this.name = name;
        this.description = description;
        this.neighbours = new ArrayList<String>(Arrays.asList(neighbours.split(",")));
    }


    /**
     * Creates a state from an Xml Element
     * @param state
     */
    public MachineState(XmlReader.Element state) {
        this(
                state.getChildByName("ID").getText(),
                StateFlag.valueOf(state.getChildByName("Flag").getText()),
                state.getChildByName("Name").getText(),
                state.getChildByName("Description").getText(),
                state.getChildByName("Neighbours").getText()
        );
    }




    public String toString(){
        return name + " " + description;
    }



    public void writeXml(XmlWriter writer) throws IOException {
        //CSV of the neighbours
        StringBuffer neighbours = new StringBuffer();
        for(Iterator it=this.neighbours.iterator(); it.hasNext(); ) {
            if (neighbours.length()>0)
                neighbours.append(",");
            neighbours.append(it.next());
        }
        writer.element("State")
                .element("ID", this.id)
                .element("Flag", this.flag.toString())
                .element("Name", this.name)
                .element("Description", this.description)
                .element("Neighbours", neighbours)
        .pop();
    }


}
