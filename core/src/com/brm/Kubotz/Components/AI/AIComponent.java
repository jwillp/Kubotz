package com.brm.Kubotz.Components.AI;

import com.brm.GoatEngine.AI.Pathfinding.PathNode;
import com.brm.GoatEngine.ECS.Components.EntityComponent;
import com.brm.GoatEngine.Utils.Timer;

import java.util.ArrayList;
import java.util.HashMap;

/**
 * Component to make to Store AI information on an entity
 */
public class AIComponent extends EntityComponent {
    public static final String ID = "KUBOTZ_AI_COMPONENT";

    public Timer reactionTime = new Timer(500); //The delay between AI logic updates

    public HashMap<String, Object> blackboard = new HashMap<String, Object>();
    
    public ArrayList<PathNode> currentPath = new ArrayList<PathNode>(); //Current pathfinding path (if any)


    public AIComponent(){
        reactionTime.start();
    }


}
