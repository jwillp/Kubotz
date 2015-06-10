package com.brm.Kubotz.AI.Components;


import com.brm.GoatEngine.ECS.core.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;
import com.brm.Kubotz.AI.Pathfinding.PathNode;


import java.util.ArrayList;
import java.util.Hashtable;

/**
 * Component to make to Store AI information on an entity
 */
public class AIComponent extends EntityComponent {
    public static final String ID = "KUBOTZ_AI_COMPONENT";

    private Timer reactionTime = new Timer(5); //The delay between AI logic updates

    private Hashtable<String, Object> blackboard = new Hashtable<String, Object>();

    private ArrayList<PathNode> currentPath = new ArrayList<PathNode>(); //Current pathfinding path (if any)


    public AIComponent(){
        reactionTime.start();
    }


    public Timer getReactionTime() {
        return reactionTime;
    }

    public Hashtable<String, Object> getBlackboard() {
        return blackboard;
    }

    public ArrayList<PathNode> getCurrentPath() {
        return currentPath;
    }

    public void setCurrentPath(ArrayList<PathNode> currentPath) {
        this.currentPath = currentPath;
    }
}