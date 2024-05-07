import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Model } from "../watch-or";

export const ModelList: React.FC = () => {
    const [models, setModels] = useState<Model[]>([]);
  
    useEffect(() => {
      fetch("/api/models")
        .then((res) => res.json())
        .then((data) => setModels(data));
    }, []);
  
    return (
      <div className="model-list">
        <ul>
          {models.map((model) => (
            <Link key={model.id} to={`/model?id=${model.id}`}>
              <li className="model-list-item">
                <span>{model.id}</span>
              </li>
            </Link>
          ))}
        </ul>
      </div>
    );
  };
  